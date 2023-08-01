// eslint-disable-next-line max-len
/* eslint-disable jest/no-restricted-matchers,@typescript-eslint/no-non-null-assertion */
import "reflect-metadata";
// eslint-disable-next-line @typescript-eslint/no-shadow
import { beforeEach } from "@jest/globals";
import { InMemoryStateService, Runtime } from "@yab/module";
// eslint-disable-next-line no-warning-comments
// TODO this is acutally a big issue
// eslint-disable-next-line import/no-extraneous-dependencies
import { AppChain } from "@yab/sdk";
import { Path } from "@yab/protocol";
import { Field, PrivateKey, PublicKey, UInt64 } from "snarkyjs";
import { log } from "@yab/common";
import { VanillaProtocol } from "@yab/protocol/src/protocol/Protocol";

import { PrivateMempool } from "../../src/mempool/private/PrivateMempool";
import { LocalTaskQueue } from "../../src/worker/queue/LocalTaskQueue";
import { UnsignedTransaction } from "../../src/mempool/PendingTransaction";
import { Sequencer } from "../../src/sequencer/executor/Sequencer";
import {
  AsyncStateService,
  BlockProducerModule,
  ManualBlockTrigger,
  TaskQueue,
} from "../../src";
import { LocalTaskWorkerModule } from "../../src/worker/worker/LocalTaskWorkerModule";

import { Balance } from "./mocks/Balance";
import { NoopBaseLayer } from "./mocks/NoopBaseLayer";

describe("block production", () => {
  beforeEach(() => {
    log.setLevel("TRACE");
  });

  it("should produce a dummy block proof", async () => {
    expect.assertions(5);

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
        Mempool: PrivateMempool,
        LocalTaskWorkerModule,
        BaseLayer: NoopBaseLayer,
        BlockProducerModule,
        BlockTrigger: ManualBlockTrigger,
      },

      config: {
        BlockTrigger: {},
        Mempool: {},
        BlockProducerModule: {},
        LocalTaskWorkerModule: {},
        BaseLayer: {},
      },
    });

    sequencer.dependencyContainer.register<TaskQueue>("TaskQueue", {
      useValue: new LocalTaskQueue(0),
    });

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

    expect(block!.txs).toHaveLength(1);
    expect(block!.proof.proof).toBe("mock-proof");

    const stateService =
      sequencer.dependencyContainer.resolve<AsyncStateService>(
        "AsyncStateService"
      );
    const balanceModule = runtime.resolve("Balance");
    const balancesPath = Path.fromKey(
      balanceModule.balances.path!,
      balanceModule.balances.keyType,
      PublicKey.empty()
    );
    const newState = await stateService.getAsync(balancesPath);

    expect(newState).toBeDefined();
    expect(UInt64.fromFields(newState!)).toStrictEqual(UInt64.from(100));
  }, 60_000);
});
