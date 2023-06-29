import { container, DependencyContainer } from "tsyringe";
import { beforeEach } from "@jest/globals";
import { InMemoryStateService, Runtime } from "@yab/module";
import { Balance } from "./mocks/Balance";
import { AppChain } from "@yab/sdk";
import {
  BaseLayer,
  BlockTrigger,
  ManualBlockTrigger,
  Sequencer,
  TaskQueue,
} from "../../src";
import { PrivateMempool } from "../../src/mempool/private/PrivateMempool";
import { LocalTaskQueue } from "../../src/worker/queue/LocalTaskQueue";
import { noop } from "@yab/protocol";
import { UnsignedTransaction } from "../../src/mempool/PendingTransaction";
import { Field, PrivateKey, PublicKey, UInt64 } from "snarkyjs";

describe("block production", () => {
  let dependencyContainer: DependencyContainer;

  beforeEach(() => {
    dependencyContainer = container.createChildContainer();
  });

  it("should produce a dummy block proof", async () => {
    const runtime = Runtime.from({
      modules: {
        Balance,
      },

      config: {
        Balance: {},
      },

      state: new InMemoryStateService(),
    });

    const sequencer = Sequencer.from({
      modules: {
        BlockTrigger: ManualBlockTrigger,
        Mempool: PrivateMempool,
      },

      config: {
        BlockTrigger: {},
        Mempool: {},
      },
    });

    sequencer.dependencyContainer.register<BaseLayer>("BaseLayer", {
      useValue: {
        blockProduced: async (block) => {},
      },
    });

    sequencer.dependencyContainer.register<TaskQueue>("TaskQueue", {
      useValue: new LocalTaskQueue(0),
    });

    const app = AppChain.from({
      runtime,
      sequencer,
    });

    // Start AppChain
    app
      .start()
      // eslint-disable-next-line promise/prefer-await-to-then
      .then(noop)
      // eslint-disable-next-line promise/prefer-await-to-then
      .catch((error: unknown) => {
        console.error(error);
      });

    const privateKey = PrivateKey.random();

    const mempool = sequencer.resolve("Mempool");
    mempool.add(
      new UnsignedTransaction({
        methodId: Field(runtime.getMethodId("Balance", "setBalance")),
        args: [...PublicKey.empty().toFields(), ...UInt64.from(100).toFields()],
        sender: privateKey.toPublicKey(),
        nonce: UInt64.from(0),
      }).sign(privateKey)
    );

    const blockTrigger = sequencer.resolve("BlockTrigger");

    const block = await blockTrigger.produceBlock();

    // TODO Retrieve BlockProof and check it
  });
});
