// eslint-disable-next-line max-len
/* eslint-disable jest/no-restricted-matchers,@typescript-eslint/no-non-null-assertion */
import "reflect-metadata";
// eslint-disable-next-line @typescript-eslint/no-shadow
import { beforeEach } from "@jest/globals";
import { Fieldable, InMemoryStateService, Runtime } from "@yab/module";
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
import { NoopBaseLayer } from "../../src/protocol/baselayer/NoopBaseLayer";

describe("block production", () => {
  let runtime: Runtime<{ Balance: typeof Balance }>;
  let sequencer: Sequencer<{
    Mempool: typeof PrivateMempool;
    LocalTaskWorkerModule: typeof LocalTaskWorkerModule;
    BaseLayer: typeof NoopBaseLayer;
    BlockProducerModule: typeof BlockProducerModule;
    BlockTrigger: typeof ManualBlockTrigger;
  }>;

  beforeEach(async () => {
    log.setLevel("TRACE");

    runtime = Runtime.from({
      modules: {
        Balance,
      },

      config: {
        Balance: {},
      },

      state: new InMemoryStateService(),
    });

    sequencer = Sequencer.from({
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
      modules: {},
    });

    // Start AppChain
    await app.start();
  });

  function createTransaction(spec: {
    privateKey: PrivateKey;
    method: [string, string];
    args: Fieldable[];
    nonce: number;
  }) {
    return new UnsignedTransaction({
      methodId: Field(runtime.getMethodId(spec.method[0], spec.method[1])),
      args: spec.args.flatMap((parameter) => parameter.toFields()),
      sender: spec.privateKey.toPublicKey(),
      nonce: UInt64.from(spec.nonce),
    }).sign(spec.privateKey);
  }

  // eslint-disable-next-line max-statements
  it("should produce a dummy block proof", async () => {
    expect.assertions(10);

    const privateKey = PrivateKey.random();

    const mempool = sequencer.resolve("Mempool");
    mempool.add(
      createTransaction({
        method: ["Balance", "setBalance"],
        privateKey,
        args: [PublicKey.empty(), UInt64.from(100)],
        nonce: 0,
      })
    );

    const blockTrigger = sequencer.resolve("BlockTrigger");

    let block = await blockTrigger.produceBlock();

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

    // Second tx
    mempool.add(
      createTransaction({
        method: ["Balance", "addBalance"],
        privateKey,
        args: [PublicKey.empty(), UInt64.from(100)],
        nonce: 0,
      })
    );

    console.log("Starting second block");

    block = await blockTrigger.produceBlock();

    expect(block).toBeDefined();

    expect(block!.txs).toHaveLength(1);
    expect(block!.proof.proof).toBe("mock-proof");

    const state2 = await stateService.getAsync(balancesPath);

    expect(state2).toBeDefined();
    expect(UInt64.fromFields(state2!)).toStrictEqual(UInt64.from(200));
  }, 60_000);
});
