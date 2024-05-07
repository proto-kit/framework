import { log, range } from "@proto-kit/common";
import { VanillaProtocolModules } from "@proto-kit/library";
import { Runtime } from "@proto-kit/module";
import {
  AccountState,
  MandatoryProtocolModulesRecord,
  Path,
  Protocol,
} from "@proto-kit/protocol";
import { AppChain } from "@proto-kit/sdk";
import { Bool, Field, PrivateKey, PublicKey, UInt64 } from "o1js";
import "reflect-metadata";
import { container } from "tsyringe";

import {
  AsyncStateService,
  BlockStorage,
  HistoricalBlockStorage,
  ManualBlockTrigger,
  PrivateMempool,
  Sequencer,
} from "../../src";
import {
  DefaultTestingSequencerModules,
  testingSequencerFromModules,
} from "../TestingSequencer";

import { Balance } from "./mocks/Balance";
import { ProtocolStateTestHook } from "./mocks/ProtocolStateTestHook";
import { createTransaction } from "./utils";

describe("block production", () => {
  let runtime: Runtime<{ Balance: typeof Balance }>;
  let sequencer: Sequencer<DefaultTestingSequencerModules>;

  let protocol: Protocol<
    MandatoryProtocolModulesRecord & {
      ProtocolStateTestHook: typeof ProtocolStateTestHook;
    }
  >;
  // let protocol: Protocol<VanillaProtocolModulesRecord>;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let appChain: AppChain<any, any, any, any>;

  let blockTrigger: ManualBlockTrigger;
  let mempool: PrivateMempool;

  beforeEach(async () => {
    // container.reset();

    log.setLevel(log.levels.INFO);

    const runtimeClass = Runtime.from({
      modules: {
        Balance,
      },

      config: {
        Balance: {},
      },
    });

    const sequencerClass = testingSequencerFromModules({});

    // TODO Analyze how we can get rid of the library import for mandatory modules
    const protocolClass = Protocol.from({
      modules: VanillaProtocolModules.mandatoryModules({
        ProtocolStateTestHook,
      }),
      // modules: VanillaProtocolModules.with({}),
    });

    const app = AppChain.from({
      Runtime: runtimeClass,
      Sequencer: sequencerClass,
      Protocol: protocolClass,
      modules: {},
    });

    app.configure({
      Sequencer: {
        Database: {},
        BlockTrigger: {},
        Mempool: {},
        BlockProducerModule: {},
        UnprovenProducerModule: {},
        LocalTaskWorkerModule: {},
        BaseLayer: {},
        TaskQueue: {},
      },
      Runtime: {
        Balance: {},
      },
      Protocol: {
        AccountState: {},
        BlockProver: {},
        StateTransitionProver: {},
        BlockHeight: {},
        LastStateRoot: {},
        ProtocolStateTestHook: {},
      },
    });

    // Start AppChain
    await app.start(container.createChildContainer());

    appChain = app;

    ({ runtime, sequencer, protocol } = app);

    blockTrigger = sequencer.resolve("BlockTrigger");
    mempool = sequencer.resolve("Mempool");
  });

  it("should produce a dummy block proof", async () => {
    expect.assertions(25);

    const privateKey = PrivateKey.random();
    const publicKey = privateKey.toPublicKey();

    await mempool.add(
      createTransaction({
        runtime,
        method: ["Balance", "setBalanceIf"],
        privateKey,
        args: [publicKey, UInt64.from(100), Bool(true)],
        nonce: 0,
      })
    );

    // let [block, batch] = await blockTrigger.produceBlock();
    let block = await blockTrigger.produceUnproven();

    expect(block).toBeDefined();

    expect(block!.transactions).toHaveLength(1);
    expect(block!.transactions[0].status.toBoolean()).toBe(true);
    expect(block!.transactions[0].statusMessage).toBeUndefined();

    expect(block!.transactions[0].stateTransitions).toHaveLength(1);
    expect(block!.transactions[0].protocolTransitions).toHaveLength(2);

    const latestBlockWithMetadata = await sequencer
      .resolve("UnprovenBlockQueue")
      .getLatestBlock();

    let batch = await blockTrigger.produceProven();

    expect(batch).toBeDefined();

    expect(batch!.bundles).toHaveLength(1);
    expect(batch!.proof.proof).toBe("mock-proof");

    expect(
      latestBlockWithMetadata!.metadata.afterNetworkState.hash().toString()
    ).toStrictEqual(batch!.toNetworkState.hash().toString());

    // Check if the batchstorage has received the block
    const batchStorage = sequencer.resolve("BlockStorage") as BlockStorage &
      HistoricalBlockStorage;
    const retrievedBatch = await batchStorage.getBlockAt(0);
    expect(retrievedBatch).toBeDefined();

    const stateService =
      sequencer.dependencyContainer.resolve<AsyncStateService>(
        "AsyncStateService"
      );

    const unprovenStateService =
      sequencer.dependencyContainer.resolve<AsyncStateService>(
        "UnprovenStateService"
      );

    const balanceModule = runtime.resolve("Balance");
    const balancesPath = Path.fromKey(
      balanceModule.balances.path!,
      balanceModule.balances.keyType,
      publicKey
    );
    const newState = await stateService.getSingleAsync(balancesPath);
    const newUnprovenState =
      await unprovenStateService.getSingleAsync(balancesPath);

    expect(newState).toBeDefined();
    expect(newUnprovenState).toBeDefined();
    expect(UInt64.fromFields(newState!)).toStrictEqual(UInt64.from(100));
    expect(UInt64.fromFields(newUnprovenState!)).toStrictEqual(
      UInt64.from(100)
    );

    // Check that nonce has been set
    const accountModule = protocol.resolve("AccountState");
    const accountStatePath = Path.fromKey(
      accountModule.accountState.path!,
      accountModule.accountState.keyType,
      publicKey
    );
    const newAccountState = await stateService.getSingleAsync(accountStatePath);

    expect(newAccountState).toBeDefined();
    expect(AccountState.fromFields(newAccountState!).nonce.toBigInt()).toBe(1n);

    // Second tx
    await mempool.add(
      createTransaction({
        runtime,
        method: ["Balance", "addBalanceToSelf"],
        privateKey,
        args: [UInt64.from(100), UInt64.from(1)],
        nonce: 1,
      })
    );

    log.info("Starting second block");

    [block, batch] = await blockTrigger.produceBlock();

    expect(block).toBeDefined();

    expect(block!.transactions).toHaveLength(1);
    console.log(block!.transactions[0]);
    console.log(block!.transactions[0].statusMessage);
    expect(block!.transactions[0].status.toBoolean()).toBe(true);
    expect(block!.transactions[0].statusMessage).toBeUndefined();

    expect(batch!.bundles).toHaveLength(1);
    expect(batch!.proof.proof).toBe("mock-proof");

    const state2 = await stateService.getSingleAsync(balancesPath);

    expect(state2).toBeDefined();
    expect(UInt64.fromFields(state2!)).toStrictEqual(UInt64.from(200));
  }, 60_000);

  it("should reject tx and not apply the state", async () => {
    expect.assertions(5);

    log.setLevel("INFO");

    const privateKey = PrivateKey.random();

    await mempool.add(
      createTransaction({
        runtime,
        method: ["Balance", "setBalanceIf"],
        privateKey,
        args: [
          PrivateKey.random().toPublicKey(),
          UInt64.from(100),
          Bool(false),
        ],
        nonce: 0,
      })
    );

    const [block] = await blockTrigger.produceBlock();

    expect(block?.transactions).toHaveLength(1);
    expect(block?.transactions[0].status.toBoolean()).toBe(false);
    expect(block?.transactions[0].statusMessage).toBe("Condition not met");

    const stateService =
      sequencer.dependencyContainer.resolve<AsyncStateService>(
        "AsyncStateService"
      );
    const unprovenStateService =
      sequencer.dependencyContainer.resolve<AsyncStateService>(
        "UnprovenStateService"
      );
    const balanceModule = runtime.resolve("Balance");
    const balancesPath = Path.fromKey(
      balanceModule.balances.path!,
      balanceModule.balances.keyType,
      PublicKey.empty()
    );
    const unprovenState =
      await unprovenStateService.getSingleAsync(balancesPath);
    const newState = await stateService.getSingleAsync(balancesPath);

    // Assert that state is not set
    expect(unprovenState).toBeUndefined();
    expect(newState).toBeUndefined();
  }, 30_000);

  const numberTxs = 3;

  it("should produce block with multiple transaction", async () => {
    expect.assertions(6 + 4 * numberTxs);

    const privateKey = PrivateKey.random();
    const publicKey = privateKey.toPublicKey();

    const increment = 100;

    const p = range(0, numberTxs).map(async (index) => {
      await mempool.add(
        createTransaction({
          runtime,
          method: ["Balance", "addBalanceToSelf"],
          privateKey,
          args: [UInt64.from(increment), UInt64.from(0)],
          nonce: index,
        })
      );
    });
    await Promise.all(p);

    const block = await blockTrigger.produceUnproven();

    expect(block).toBeDefined();
    expect(block!.transactions).toHaveLength(numberTxs);

    range(0, numberTxs).forEach((index) => {
      expect(block!.transactions[index].status.toBoolean()).toBe(true);
      expect(block!.transactions[index].statusMessage).toBe(undefined);

      const transitions = block!.transactions[index].stateTransitions;

      const fromBalance = increment * index;
      expect(transitions[0].fromValue.value[0].toBigInt()).toStrictEqual(
        BigInt(fromBalance)
      );
      expect(transitions[0].toValue.value[0].toBigInt()).toStrictEqual(
        BigInt(fromBalance + increment)
      );
    });

    const batch = await blockTrigger.produceProven();

    expect(batch!.bundles).toHaveLength(1);
    expect(batch!.proof.proof).toBe("mock-proof");

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
    const newState = await stateService.getSingleAsync(balancesPath);

    expect(newState).toBeDefined();
    expect(UInt64.fromFields(newState!)).toStrictEqual(
      UInt64.from(100 * numberTxs)
    );
  }, 160_000);

  it("should produce a block with a mix of failing and succeeding transactions and empty blocks", async () => {
    expect.assertions(7);

    const pk1 = PrivateKey.random();
    const pk2 = PrivateKey.random();

    await mempool.add(
      createTransaction({
        runtime,
        method: ["Balance", "setBalanceIf"],
        privateKey: pk1,
        args: [pk1.toPublicKey(), UInt64.from(100), Bool(false)],
        nonce: 0,
      })
    );
    await mempool.add(
      createTransaction({
        runtime,
        method: ["Balance", "setBalanceIf"],
        privateKey: pk2,
        args: [pk2.toPublicKey(), UInt64.from(100), Bool(true)],
        nonce: 0,
      })
    );

    const block = await blockTrigger.produceUnproven();
    await blockTrigger.produceUnproven();
    const batch = await blockTrigger.produceProven();

    expect(block).toBeDefined();

    expect(batch!.bundles).toHaveLength(2);
    expect(block!.transactions).toHaveLength(2);

    const stateService =
      sequencer.dependencyContainer.resolve<AsyncStateService>(
        "AsyncStateService"
      );
    const balanceModule = runtime.resolve("Balance");
    const balancesPath1 = Path.fromKey(
      balanceModule.balances.path!,
      balanceModule.balances.keyType,
      pk1.toPublicKey()
    );
    const newState1 = await stateService.getSingleAsync(balancesPath1);

    expect(newState1).toBeUndefined();

    const balancesPath2 = Path.fromKey(
      balanceModule.balances.path!,
      balanceModule.balances.keyType,
      pk2.toPublicKey()
    );
    const newState2 = await stateService.getSingleAsync(balancesPath2);

    expect(newState2).toBeDefined();
    expect(UInt64.fromFields(newState2!)).toStrictEqual(UInt64.from(100));

    await blockTrigger.produceUnproven();
    await blockTrigger.produceUnproven();
    const proven2 = await blockTrigger.produceProven();

    expect(proven2?.bundles.length).toBe(2);
  }, 720_000);

  it.skip.each([
    [2, 1, 1],
    [1, 2, 1],
    [1, 1, 2],
    [2, 2, 2],
  ])(
    "should produce multiple blocks with multiple batches with multiple transactions",
    async (batches, blocksPerBatch, txsPerBlock) => {
      expect.assertions(2 * batches + 3 * batches * blocksPerBatch);

      const sender = PrivateKey.random();

      const keys = range(0, batches * blocksPerBatch * txsPerBlock).map(() =>
        PrivateKey.random()
      );

      const increment = 100;

      let iterationIndex = 0;

      for (let i = 0; i < batches; i++) {
        for (let j = 0; j < blocksPerBatch; j++) {
          for (let k = 0; k < txsPerBlock; k++) {
            await mempool.add(
              createTransaction({
                runtime,
                method: ["Balance", "addBalance"],
                privateKey: sender,
                args: [
                  keys[iterationIndex].toPublicKey(),
                  UInt64.from(increment * (iterationIndex + 1)),
                ],
                nonce: iterationIndex,
              })
            );

            iterationIndex += 1;
          }

          // Produce block
          const block = await blockTrigger.produceUnproven();

          expect(block).toBeDefined();
          expect(block!.transactions).toHaveLength(txsPerBlock);
          expect(block!.transactions[0].status.toBoolean()).toBe(true);
        }

        const batch = await blockTrigger.produceProven();

        expect(batch).toBeDefined();
        expect(batch!.bundles).toHaveLength(blocksPerBatch);
      }
    },
    500_000
  );

  it("should produce block with a tx with a lot of STs", async () => {
    expect.assertions(11);

    const privateKey = PrivateKey.random();

    const field = Field(100);

    await mempool.add(
      createTransaction({
        runtime,
        method: ["Balance", "lotOfSTs"],
        privateKey,
        args: [field],
        nonce: 0,
      })
    );

    const [block, batch] = await blockTrigger.produceBlock();

    expect(block).toBeDefined();
    expect(batch).toBeDefined();

    expect(block!.transactions).toHaveLength(1);

    expect(block!.transactions[0].status.toBoolean()).toBe(true);
    expect(block!.transactions[0].statusMessage).toBe(undefined);

    expect(batch!.bundles).toHaveLength(1);
    expect(batch!.proof.proof).toBe("mock-proof");

    const stateService =
      sequencer.dependencyContainer.resolve<AsyncStateService>(
        "AsyncStateService"
      );
    const supplyPath = Path.fromProperty("Balance", "totalSupply");
    const newState = await stateService.getSingleAsync(supplyPath);

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

    const newBalance = await stateService.getSingleAsync(balancesPath);

    expect(newBalance).toBeDefined();
    expect(UInt64.fromFields(newBalance!)).toStrictEqual(UInt64.from(200));
  }, 360_000);
});
