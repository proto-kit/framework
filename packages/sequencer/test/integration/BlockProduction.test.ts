import "reflect-metadata";
import { container, DependencyContainer } from "tsyringe";
import { beforeEach } from "@jest/globals";
import { InMemoryStateService, Runtime } from "@yab/module";
import { Balance } from "./mocks/Balance";
import { AppChain } from "@yab/sdk";
import { PrivateMempool } from "../../src/mempool/private/PrivateMempool";
import { LocalTaskQueue } from "../../src/worker/queue/LocalTaskQueue";
import { noop } from "@yab/protocol";
import { UnsignedTransaction } from "../../src/mempool/PendingTransaction";
import { Field, PrivateKey, PublicKey, UInt64 } from "snarkyjs";
import { AreProofsEnabled, log } from "@yab/common";
import { Sequencer } from "../../src/sequencer/executor/Sequencer";
import {
  BaseLayer,
  BlockProducerModule, BlockProvingTask,
  ManualBlockTrigger, RuntimeProvingTask, StateTransitionTask,
  TaskQueue,
  TaskWorker
} from "../../src";
import { VanillaProtocol } from "@yab/protocol/src/protocol/Protocol";
import { LocalTaskWorkerModule } from "../../src/worker/worker/LocalTaskWorkerModule";

const appChainMock: AreProofsEnabled = {
  areProofsEnabled: false,

  setProofsEnabled(areProofsEnabled: boolean) {
    this.areProofsEnabled = areProofsEnabled;
  },
};

describe("block production", () => {
  let dependencyContainer: DependencyContainer;

  beforeEach(() => {
    dependencyContainer = container.createChildContainer();

    log.setLevel("TRACE");
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
        BlockProducerModule,
        LocalTaskWorkerModule,
      },

      config: {
        BlockTrigger: {},
        Mempool: {},
        BlockProducerModule: {proofsEnabled: false},
        LocalTaskWorkerModule: {},
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

    // const x = VanillaProtocol.create().stateTransitionProver.zkProgram

    const app = AppChain.from({
      runtime,
      sequencer,
      protocol: VanillaProtocol.create(),
    });

    // Start AppChain
    // app
    //   .start()
    //   // eslint-disable-next-line promise/prefer-await-to-then
    //   .then(noop)
    //   // eslint-disable-next-line promise/prefer-await-to-then
    //   .catch((error: unknown) => {
    //     console.error(error);
    //   });
    await app.start();

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

    expect(block).toBeDefined();

    expect(block!.txs.length).toStrictEqual(1);
    expect(block!.proof.proof).toStrictEqual("mock-proof")
  }, 60_000);
});
