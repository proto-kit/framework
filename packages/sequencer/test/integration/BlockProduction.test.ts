// eslint-disable-next-line max-len
/* eslint-disable jest/no-restricted-matchers,@typescript-eslint/no-non-null-assertion,jest/max-expects,max-lines */
import "reflect-metadata";
// eslint-disable-next-line no-warning-comments
// TODO this is actually a big issue
// eslint-disable-next-line import/no-extraneous-dependencies
import { AppChain } from "@proto-kit/sdk";
import { Fieldable, Runtime, MethodIdResolver } from "@proto-kit/module";
import {
  AccountState,
  AccountStateModule, BlockHeightHook,
  BlockProver,
  Option,
  Path,
  Protocol,
  StateTransition,
  StateTransitionProver,
  VanillaProtocol
} from "@proto-kit/protocol";
import { Bool, Field, PrivateKey, PublicKey, UInt64 } from "o1js";
import { log, range } from "@proto-kit/common";

import { PrivateMempool } from "../../src/mempool/private/PrivateMempool";
import { LocalTaskQueue } from "../../src/worker/queue/LocalTaskQueue";
import { UnsignedTransaction } from "../../src/mempool/PendingTransaction";
import { Sequencer } from "../../src/sequencer/executor/Sequencer";
import {
  AsyncStateService,
  BlockProducerModule, CachedMerkleTreeStore,
  ManualBlockTrigger, MockAsyncMerkleTreeStore
} from "../../src";
import { LocalTaskWorkerModule } from "../../src/worker/worker/LocalTaskWorkerModule";

import { Balance } from "./mocks/Balance";
import { NoopBaseLayer } from "../../src/protocol/baselayer/NoopBaseLayer";
import { UnprovenProducerModule } from "../../src/protocol/production/unproven/UnprovenProducerModule";
import { container } from "tsyringe";

describe("block production", () => {
  let runtime: Runtime<{ Balance: typeof Balance }>;
  let sequencer: Sequencer<{
    Mempool: typeof PrivateMempool;
    LocalTaskWorkerModule: typeof LocalTaskWorkerModule;
    BaseLayer: typeof NoopBaseLayer;
    BlockProducerModule: typeof BlockProducerModule;
    UnprovenProducerModule: typeof UnprovenProducerModule;
    BlockTrigger: typeof ManualBlockTrigger;
    TaskQueue: typeof LocalTaskQueue;
  }>;

  let protocol: Protocol<{
    AccountStateModule: typeof AccountStateModule;
    BlockHeightHook: typeof BlockHeightHook;
    BlockProver: typeof BlockProver;
    StateTransitionProver: typeof StateTransitionProver;
  }>;

  let appChain: AppChain<any, any, any, any>;

  let blockTrigger: ManualBlockTrigger;
  let mempool: PrivateMempool;

  beforeEach(async () => {
    // container.reset();

    log.setLevel(log.levels.DEBUG);

    const runtimeClass = Runtime.from({
      modules: {
        Balance,
      },

      config: {
        Balance: {},
      },
    });

    const sequencerClass = Sequencer.from({
      modules: {
        Mempool: PrivateMempool,
        LocalTaskWorkerModule,
        BaseLayer: NoopBaseLayer,
        BlockProducerModule,
        UnprovenProducerModule,
        BlockTrigger: ManualBlockTrigger,
        TaskQueue: LocalTaskQueue,
      },

      config: {
        BlockTrigger: {},
        Mempool: {},
        BlockProducerModule: {},
        UnprovenProducerModule: {},
        LocalTaskWorkerModule: {},
        BaseLayer: {},
        TaskQueue: {},
      },
    });

    const protocolClass = VanillaProtocol.from(
      { AccountStateModule, BlockHeightHook },
      { StateTransitionProver: {}, BlockProver: {}, AccountStateModule: {}, BlockHeightHook: {} }
    );

    const app = AppChain.from({
      runtime: runtimeClass,
      sequencer: sequencerClass,
      protocol: protocolClass,
      modules: {},
    });

    app.configure({
      Sequencer: {
        BlockTrigger: {},
        Mempool: {},
        BlockProducerModule: {
          simulateProvers: true,
        },
        UnprovenProducerModule: {},
        LocalTaskWorkerModule: {},
        BaseLayer: {},
        TaskQueue: {},
      },
      Runtime: {
        Balance: {},
      },
      Protocol: {
        AccountStateModule: {},
        BlockProver: {},
        StateTransitionProver: {},
        BlockHeightHook: {}
      },
    });

    // Start AppChain
    await app.start(container.createChildContainer());

    appChain = app;

    ({ runtime, sequencer, protocol } = app);

    blockTrigger = sequencer.resolve("BlockTrigger");
    mempool = sequencer.resolve("Mempool");
  });

  function createTransaction(spec: {
    privateKey: PrivateKey;
    method: [string, string];
    args: Fieldable[];
    nonce: number;
  }) {
    const methodId = runtime.dependencyContainer
      .resolve<MethodIdResolver>("MethodIdResolver")
      .getMethodId(spec.method[0], spec.method[1]);

    return new UnsignedTransaction({
      methodId: Field(methodId),
      args: spec.args.flatMap((parameter) => parameter.toFields()),
      sender: spec.privateKey.toPublicKey(),
      nonce: UInt64.from(spec.nonce),
    }).sign(spec.privateKey);
  }

  // eslint-disable-next-line max-statements
  it.only("should produce a dummy block proof", async () => {
    expect.assertions(18);

    const privateKey = PrivateKey.random();
    const publicKey = privateKey.toPublicKey();

    mempool.add(
      createTransaction({
        method: ["Balance", "setBalanceIf"],
        privateKey,
        args: [publicKey, UInt64.from(100), Bool(true)],
        nonce: 0,
      })
    );

    let block = await blockTrigger.produceBlock();

    expect(block).toBeDefined();

    expect(block!.bundles).toHaveLength(1);
    expect(block!.bundles[0]).toHaveLength(1);
    expect(block!.bundles[0][0].status).toBe(true);
    expect(block!.bundles[0][0].statusMessage).toBeUndefined();
    expect(block!.proof.proof).toBe("mock-proof");

    const stateService =
      sequencer.dependencyContainer.resolve<AsyncStateService>(
        "AsyncStateService"
      );
    const balanceModule = runtime.resolve("Balance");
    const balancesPath = Path.fromKey(
      balanceModule.balances.path!,
      balanceModule.balances.keyType,
      publicKey
    );
    const newState = await stateService.getAsync(balancesPath);

    expect(newState).toBeDefined();
    expect(UInt64.fromFields(newState!)).toStrictEqual(UInt64.from(100));

    // Check that nonce has been set
    const accountModule = protocol.resolve("AccountStateModule");
    const accountStatePath = Path.fromKey(
      accountModule.accountState.path!,
      accountModule.accountState.keyType,
      publicKey
    );
    const newAccountState = await stateService.getAsync(accountStatePath);

    expect(newAccountState).toBeDefined();
    expect(AccountState.fromFields(newAccountState!).nonce.toBigInt()).toBe(1n);

    // Second tx
    mempool.add(
      createTransaction({
        method: ["Balance", "addBalanceToSelf"],
        privateKey,
        args: [UInt64.from(100), UInt64.from(1)],
        nonce: 1,
      })
    );

    log.info("Starting second block");

    block = await blockTrigger.produceBlock();

    expect(block).toBeDefined();

    expect(block!.bundles).toHaveLength(1);
    expect(block!.bundles[0]).toHaveLength(1);
    console.log(block!.bundles[0][0]);
    console.log(block!.bundles[0][0].statusMessage);
    expect(block!.bundles[0][0].status).toBe(true);
    expect(block!.bundles[0][0].statusMessage).toBeUndefined();
    expect(block!.proof.proof).toBe("mock-proof");

    const state2 = await stateService.getAsync(balancesPath);

    expect(state2).toBeDefined();
    expect(UInt64.fromFields(state2!)).toStrictEqual(UInt64.from(200));
  }, 60_000);

  // TODO Fix the error that we get when execution this after the first test
  it("should reject tx and not apply the state", async () => {
    expect.assertions(3);

    const privateKey = PrivateKey.random();

    mempool.add(
      createTransaction({
        method: ["Balance", "setBalanceIf"],
        privateKey,
        args: [PublicKey.empty(), UInt64.from(100), Bool(false)],
        nonce: 0,
      })
    );

    let block = await blockTrigger.produceBlock();

    expect(block?.bundles[0][0].status).toBe(false);
    expect(block?.bundles[0][0].statusMessage).toBe("Condition not met");

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

    // Assert that state is not set
    expect(newState).toBeUndefined();
  }, 30_000);

  const numberTxs = 3;

  it("should produce block with multiple transaction", async () => {
    // eslint-disable-next-line jest/prefer-expect-assertions
    expect.assertions(5 + 2 * numberTxs);

    const privateKey = PrivateKey.random();
    const publicKey = privateKey.toPublicKey();

    range(0, numberTxs).forEach((index) => {
      mempool.add(
        createTransaction({
          method: ["Balance", "addBalanceToSelf"],
          privateKey,
          args: [UInt64.from(100), UInt64.from(1)],
          nonce: index,
        })
      );
    });

    const block = await blockTrigger.produceBlock();

    expect(block).toBeDefined();

    expect(block!.bundles).toHaveLength(0);
    expect(block!.bundles[0]).toHaveLength(numberTxs);
    expect(block!.proof.proof).toBe("mock-proof");

    range(0, numberTxs).forEach((index) => {
      expect(block!.bundles[0][index].status).toBe(true);
      expect(block!.bundles[0][index].statusMessage).toBe(undefined);
    });

    const stateService =
      sequencer.dependencyContainer.resolve<AsyncStateService>(
        "AsyncStateService"
      );
    const balanceModule = runtime.resolve("Balance");
    const balancesPath = Path.fromKey(
      balanceModule.balances.path!,
      balanceModule.balances.keyType,
      publicKey
    );
    const newState = await stateService.getAsync(balancesPath);

    expect(newState).toBeDefined();
    expect(UInt64.fromFields(newState!)).toStrictEqual(
      UInt64.from(100 * numberTxs)
    );
  }, 160_000);

  it.skip.each([
    [
      "EKFZbsQfNiqjDiWGU7G3TVPauS3s9YgWgayMzjkEaDTEicsY9poM",
      "EKFdtp8D6mP3aFvCMRa75LPaUBn1QbmEs1YjTPXYLTNeqPYtnwy2",
    ],
    [
      "EKE8hTdmVrYisQSc5oqeM7inCA2fFCvZ8Y5K2CPfV4NBwSJtxads",
      "EKFct4rQwPV9N9F2J1oogaWrZLD1c5apyn997ncsmSKjoJCFDMsQ",
    ],
  ])(
    "dex repro",
    async ([pk1string, pk2string]) => {
      const pk1 = PrivateKey.fromBase58(pk1string);
      const pk2 = PrivateKey.fromBase58(pk2string);

      mempool.add(
        createTransaction({
          method: ["Balance", "setBalanceIf"],
          privateKey: pk1,
          args: [pk1.toPublicKey(), UInt64.from(100), Bool(true)],
          nonce: 0,
        })
      );

      await blockTrigger.produceBlock();

      mempool.add(
        createTransaction({
          method: ["Balance", "setBalanceIf"],
          privateKey: pk2,
          args: [pk2.toPublicKey(), UInt64.from(200), Bool(true)],
          nonce: 0,
        })
      );

      await blockTrigger.produceBlock();
    },
    60000
  );

  it("should produce block with a tx with a lot of STs", async () => {
    expect.assertions(9);

    const privateKey = PrivateKey.random();

    const field = Field(100);

    mempool.add(
      createTransaction({
        method: ["Balance", "lotOfSTs"],
        privateKey,
        args: [field],
        nonce: 0,
      })
    );

    const block = await blockTrigger.produceBlock();

    expect(block).toBeDefined();

    expect(block!.bundles).toHaveLength(1);
    expect(block!.bundles[0]).toHaveLength(1);
    expect(block!.proof.proof).toBe("mock-proof");

    expect(block!.bundles[0][0].status).toBe(true);
    expect(block!.bundles[0][0].statusMessage).toBe(undefined);

    const stateService =
      sequencer.dependencyContainer.resolve<AsyncStateService>(
        "AsyncStateService"
      );
    const supplyPath = Path.fromProperty("Balance", "totalSupply");
    const newState = await stateService.getAsync(supplyPath);

    expect(newState).toBeDefined();
    expect(UInt64.fromFields(newState!)).toStrictEqual(
      // 10 is the number of iterations inside the runtime method
      UInt64.from(100 * 10)
    );

    const pk2 = PublicKey.from({ x: field.add(Field(2)), isOdd: Bool(false) });
    const balanceModule = runtime.resolve("Balance");
    const balancesPath = Path.fromKey(
      balanceModule.balances.path!,
      balanceModule.balances.keyType,
      pk2
    );

    const newBalance = await stateService.getAsync(balancesPath);

    expect(newBalance).toBeDefined();
    expect(UInt64.fromFields(newBalance!)).toStrictEqual(UInt64.from(200));
  }, 360_000);
});
