import {
  log,
  range,
  MOCK_PROOF,
  expectDefined,
  mapSequential,
} from "@proto-kit/common";
import { VanillaProtocolModules } from "@proto-kit/library";
import {
  Runtime,
  runtimeMethod,
  RuntimeModule,
  runtimeModule,
  RuntimeEvents,
} from "@proto-kit/module";
import {
  AccountState,
  MandatoryProtocolModulesRecord,
  Path,
  Protocol,
  PROTOKIT_PREFIXES,
} from "@proto-kit/protocol";
import { AppChain } from "@proto-kit/sdk";
import { Bool, Field, PrivateKey, PublicKey, Struct, UInt64 } from "o1js";
import "reflect-metadata";
import { container } from "tsyringe";

import {
  BatchStorage,
  HistoricalBatchStorage,
  Sequencer,
  VanillaTaskWorkerModules,
} from "../../src";
import {
  DefaultTestingSequencerModules,
  testingSequencerModules,
} from "../TestingSequencer";

import { Balance } from "./mocks/Balance";
import { ProtocolStateTestHook } from "./mocks/ProtocolStateTestHook";
import { NoopRuntime } from "./mocks/NoopRuntime";
import { BlockTestService } from "./services/BlockTestService";

export class PrimaryTestEvent extends Struct({
  message: Bool,
}) {}

export class SecondaryTestEvent extends Struct({
  message: Bool,
}) {}

@runtimeModule()
class EventMaker extends RuntimeModule {
  public constructor() {
    super();
  }

  public events = new RuntimeEvents({
    primary: PrimaryTestEvent,
    secondary: SecondaryTestEvent,
  });

  @runtimeMethod()
  public async makeEvent() {
    this.events.emit("primary", new PrimaryTestEvent({ message: Bool(false) }));
    // Should not emit as condition is false.
    this.events.emitIf(
      Bool(false),
      "primary",
      new PrimaryTestEvent({ message: Bool(false) })
    );
    this.events.emit(
      "secondary",
      new SecondaryTestEvent({ message: Bool(true) })
    );
  }
}

describe("block production", () => {
  let runtime: Runtime<{
    Balance: typeof Balance;
    NoopRuntime: typeof NoopRuntime;
    EventMaker: typeof EventMaker;
  }>;
  let sequencer: Sequencer<DefaultTestingSequencerModules>;

  let protocol: Protocol<
    MandatoryProtocolModulesRecord & {
      ProtocolStateTestHook: typeof ProtocolStateTestHook;
    }
  >;
  // let protocol: Protocol<VanillaProtocolModulesRecord>;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let appChain: AppChain<any, any, any, any>;

  let test: BlockTestService;

  beforeEach(async () => {
    const runtimeClass = Runtime.from({
      modules: {
        Balance,
        NoopRuntime,
        EventMaker,
      },

      config: {
        Balance: {},
        NoopRuntime: {},
        EventMaker: {},
      },
    });

    const sequencerClass = Sequencer.from({
      modules: testingSequencerModules({}),
    });

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
        BatchProducerModule: {},
        BlockProducerModule: {},
        LocalTaskWorkerModule: VanillaTaskWorkerModules.defaultConfig(),
        BaseLayer: {},
        TaskQueue: {},
        FeeStrategy: {},
        SequencerStartupModule: {},
      },
      Runtime: {
        Balance: {},
        NoopRuntime: {},
        EventMaker: {},
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

    try {
      // Start AppChain
      await app.start(false, container.createChildContainer());
    } catch (e) {
      console.error(e);
      throw e;
    }

    appChain = app;

    // @ts-ignore
    ({ runtime, sequencer, protocol } = app);

    test = app.sequencer.dependencyContainer.resolve(BlockTestService);
  });

  it("should produce a dummy block proof", async () => {
    expect.assertions(26);

    const privateKey = PrivateKey.random();
    const publicKey = privateKey.toPublicKey();

    await test.addTransaction({
      method: ["Balance", "setBalanceIf"],
      privateKey,
      args: [publicKey, UInt64.from(100), Bool(true)],
    });

    // let [block, batch] = await blockTrigger.produceBlockAndBatch();
    let block = await test.produceBlock();

    expect(block).toBeDefined();

    expect(block!.transactions).toHaveLength(1);
    expect(block!.transactions[0].status.toBoolean()).toBe(true);
    expect(block!.transactions[0].statusMessage).toBeUndefined();

    expect(block!.transactions[0].stateTransitions).toHaveLength(3);
    expect(
      block!.transactions[0].stateTransitions[0].stateTransitions
    ).toHaveLength(2);
    expect(
      block!.transactions[0].stateTransitions[1].stateTransitions
    ).toHaveLength(1);

    const latestBlockWithResult = await sequencer
      .resolve("BlockQueue")
      .getLatestBlockAndResult();

    let batch = await test.produceBatch();

    expect(batch).toBeDefined();

    expect(batch!.blockHashes).toHaveLength(1);
    expect(batch!.proof.proof).toBe(MOCK_PROOF);

    expectDefined(latestBlockWithResult);
    expectDefined(latestBlockWithResult.result);
    expect(
      latestBlockWithResult.result.afterNetworkState.hash().toString()
    ).toStrictEqual(batch!.toNetworkState.hash().toString());

    // Check if the batchstorage has received the block
    const batchStorage = sequencer.resolve("BatchStorage") as BatchStorage &
      HistoricalBatchStorage;
    const retrievedBatch = await batchStorage.getBatchAt(0);
    expect(retrievedBatch).toBeDefined();

    const balanceModule = runtime.resolve("Balance");
    const balancesPath = Path.fromKey(
      balanceModule.balances.path!,
      balanceModule.balances.keyType,
      publicKey
    );
    // TODO
    // const newState = await test.getState(balancesPath, "batch");
    const newUnprovenState = await test.getState(balancesPath, "block");

    // expect(newState).toBeDefined();
    expect(newUnprovenState).toBeDefined();
    // expect(UInt64.fromFields(newState!).toString()).toStrictEqual("100");
    expect(UInt64.fromFields(newUnprovenState!).toString()).toStrictEqual(
      "100"
    );

    // Check that nonce has been set
    const accountModule = protocol.resolve("AccountState");
    const accountStatePath = Path.fromKey(
      accountModule.accountState.path!,
      accountModule.accountState.keyType,
      publicKey
    );
    const newAccountState = await test.getState(accountStatePath, "block");

    expect(newAccountState).toBeDefined();
    expect(AccountState.fromFields(newAccountState!).nonce.toBigInt()).toBe(1n);

    // Second tx
    await test.addTransaction({
      method: ["Balance", "addBalanceToSelf"],
      privateKey,
      args: [UInt64.from(100), UInt64.from(1)],
    });

    log.info("Starting second block");

    [block, batch] = await test.produceBlockAndBatch();

    expect(block).toBeDefined();

    expect(block!.transactions).toHaveLength(1);
    expect(block!.transactions[0].status.toBoolean()).toBe(true);
    expect(block!.transactions[0].statusMessage).toBeUndefined();

    expect(batch!.blockHashes).toHaveLength(1);
    expect(batch!.proof.proof).toBe(MOCK_PROOF);

    const state2 = await test.getState(balancesPath, "block");

    expect(state2).toBeDefined();
    expect(UInt64.fromFields(state2!)).toStrictEqual(UInt64.from(200));
  }, 60_000);

  it("should reject tx and not apply the state", async () => {
    expect.assertions(5);

    const privateKey = PrivateKey.random();

    await test.addTransaction({
      method: ["Balance", "setBalanceIf"],
      privateKey,
      args: [PrivateKey.random().toPublicKey(), UInt64.from(100), Bool(false)],
    });

    const [block] = await test.produceBlockAndBatch();

    expect(block?.transactions).toHaveLength(1);
    expect(block?.transactions[0].status.toBoolean()).toBe(false);
    expect(block?.transactions[0].statusMessage).toBe("Condition not met");

    const balanceModule = runtime.resolve("Balance");
    const balancesPath = Path.fromKey(
      balanceModule.balances.path!,
      balanceModule.balances.keyType,
      PublicKey.empty()
    );
    const unprovenState = await test.getState(balancesPath, "block");
    const newState = await test.getState(balancesPath, "batch");

    // Assert that state is not set
    expect(unprovenState).toBeUndefined();
    expect(newState).toBeUndefined();
  }, 30_000);

  it("should produce txs in non-consecutive blocks", async () => {
    const privateKey = PrivateKey.random();
    const publicKey = privateKey.toPublicKey();

    const privateKey2 = PrivateKey.random();
    const publicKey2 = privateKey2.toPublicKey();

    await test.addTransaction({
      method: ["Balance", "setBalanceIf"],
      privateKey,
      args: [publicKey, UInt64.from(100), Bool(true)],
    });

    // let [block, batch] = await blockTrigger.produceBlockAndBatch();
    const block = await test.produceBlock();

    expect(block).toBeDefined();

    expect(block!.transactions).toHaveLength(1);
    expect(block!.transactions[0].status.toBoolean()).toBe(true);
    expect(block!.transactions[0].statusMessage).toBeUndefined();

    expect(
      block!.transactions[0].stateTransitions[0].stateTransitions
    ).toHaveLength(2);
    expect(
      block!.transactions[0].stateTransitions[1].stateTransitions
    ).toHaveLength(1);

    await test.produceBlock();

    await test.addTransaction({
      method: ["Balance", "setBalanceIf"],
      privateKey: privateKey2,
      args: [publicKey2, UInt64.from(100), Bool(true)],
    });
    await test.produceBlock();

    await test.addTransaction({
      method: ["Balance", "setBalanceIf"],
      privateKey: privateKey2,
      args: [publicKey2, UInt64.from(100), Bool(true)],
    });

    await test.produceBlock();

    await test.addTransaction({
      method: ["Balance", "setBalanceIf"],
      privateKey: privateKey2,
      args: [publicKey2, UInt64.from(100), Bool(true)],
    });

    await test.produceBlock();

    await test.addTransaction({
      method: ["Balance", "setBalanceIf"],
      privateKey: privateKey2,
      args: [publicKey2, UInt64.from(100), Bool(true)],
    });
    await test.produceBlock();

    // Second tx
    await test.addTransaction({
      method: ["Balance", "setBalanceIf"],
      privateKey,
      args: [publicKey, UInt64.from(100), Bool(true)],
    });

    log.info("Starting second block");

    const block2 = await test.produceBlock();

    expect(block2).toBeDefined();

    expect(block2!.transactions).toHaveLength(1);
    expect(block2!.transactions[0].status.toBoolean()).toBe(true);
    expect(block2!.transactions[0].statusMessage).toBeUndefined();
  }, 60_000);

  const numberTxs = 3;

  it("should produce block with multiple transaction", async () => {
    log.setLevel("TRACE");

    expect.assertions(6 + 4 * numberTxs);

    const privateKey = PrivateKey.random();
    const publicKey = privateKey.toPublicKey();

    const increment = 100;

    await mapSequential(range(0, numberTxs), async (index) => {
      await test.addTransaction({
        method: ["Balance", "addBalanceToSelf"],
        privateKey,
        args: [UInt64.from(increment), UInt64.from(0)],
      });
    });

    const block = await test.produceBlock();

    expect(block).toBeDefined();
    expect(block!.transactions).toHaveLength(numberTxs);

    range(0, numberTxs).forEach((index) => {
      expect(block!.transactions[index].status.toBoolean()).toBe(true);
      expect(block!.transactions[index].statusMessage).toBe(undefined);

      const transitions =
        block!.transactions[index].stateTransitions[1].stateTransitions;

      const fromBalance = increment * index;
      expect(transitions[0].fromValue.value[0].toBigInt()).toStrictEqual(
        BigInt(fromBalance)
      );
      expect(transitions[0].toValue.value[0].toBigInt()).toStrictEqual(
        BigInt(fromBalance + increment)
      );
    });

    const batch = await test.produceBatch();

    expect(batch!.blockHashes).toHaveLength(1);
    expect(batch!.proof.proof).toBe(MOCK_PROOF);

    const balanceModule = runtime.resolve("Balance");
    const balancesPath = Path.fromKey(
      balanceModule.balances.path!,
      balanceModule.balances.keyType,
      publicKey
    );
    const newState = await test.getState(balancesPath, "block");

    expect(newState).toBeDefined();
    expect(UInt64.fromFields(newState!)).toStrictEqual(
      UInt64.from(100 * numberTxs)
    );
  }, 160_000);

  it("should produce a block with a mix of failing and succeeding transactions and empty blocks", async () => {
    expect.assertions(7);

    log.setLevel("TRACE");

    const pk1 = PrivateKey.random();
    const pk2 = PrivateKey.random();

    await test.addTransaction({
      method: ["Balance", "setBalanceIf"],
      privateKey: pk1,
      args: [pk1.toPublicKey(), UInt64.from(100), Bool(false)],
    });
    await test.addTransaction({
      method: ["Balance", "setBalanceIf"],
      privateKey: pk2,
      args: [pk2.toPublicKey(), UInt64.from(100), Bool(true)],
    });

    const block = await test.produceBlock();
    await test.produceBlock();
    const batch = await test.produceBatch();

    console.log("Pt1");

    expect(block).toBeDefined();

    expect(batch!.blockHashes).toHaveLength(2);
    expect(block!.transactions).toHaveLength(2);

    const balanceModule = runtime.resolve("Balance");
    const balancesPath1 = Path.fromKey(
      balanceModule.balances.path!,
      balanceModule.balances.keyType,
      pk1.toPublicKey()
    );
    const newState1 = await test.getState(balancesPath1, "block");

    expect(newState1).toBeUndefined();

    const balancesPath2 = Path.fromKey(
      balanceModule.balances.path!,
      balanceModule.balances.keyType,
      pk2.toPublicKey()
    );
    const newState2 = await test.getState(balancesPath2, "block");

    expect(newState2).toBeDefined();
    expect(UInt64.fromFields(newState2!)).toStrictEqual(UInt64.from(100));

    await test.produceBlock();
    await test.produceBlock();
    const proven2 = await test.produceBatch();

    expect(proven2?.blockHashes.length).toBe(2);
  }, 720_000);

  // TODO Test with batch that only consists of empty blocks

  it.each([
    [2, 1, 1],
    [1, 2, 1],
    [1, 1, 2],
    [2, 2, 2],
    [1, 14, 0],
  ])(
    "should produce multiple blocks with multiple batches with multiple transactions",
    async (batches, blocksPerBatch, txsPerBlock) => {
      expect.assertions(
        2 * batches +
          1 * batches * blocksPerBatch +
          2 * batches * blocksPerBatch * txsPerBlock
      );

      log.setLevel("DEBUG");

      const sender = PrivateKey.random();

      const keys = range(0, batches * blocksPerBatch * txsPerBlock).map(() =>
        PrivateKey.random()
      );

      const increment = 100;

      let iterationIndex = 0;

      for (let i = 0; i < batches; i++) {
        for (let j = 0; j < blocksPerBatch; j++) {
          for (let k = 0; k < txsPerBlock; k++) {
            await test.addTransaction({
              method: ["Balance", "addBalance"],
              privateKey: sender,
              args: [
                keys[iterationIndex].toPublicKey(),
                UInt64.from(increment * (iterationIndex + 1)),
              ],
            });

            iterationIndex += 1;
          }

          // Produce block
          const block = await test.produceBlock();

          expect(block).toBeDefined();

          for (let k = 0; k < txsPerBlock; k++) {
            expect(block!.transactions).toHaveLength(txsPerBlock);
            expect(block!.transactions[0].status.toBoolean()).toBe(true);
          }
        }

        const batch = await test.produceBatch();

        expect(batch).toBeDefined();
        expect(batch!.blockHashes).toHaveLength(blocksPerBatch);
      }
    },
    500_000
  );

  it("should produce block with a tx with a lot of STs", async () => {
    expect.assertions(11);

    const privateKey = PrivateKey.random();

    const field = Field(100);

    await test.addTransaction({
      method: ["Balance", "lotOfSTs"],
      privateKey,
      args: [field],
    });

    const [block, batch] = await test.produceBlockAndBatch();

    expect(block).toBeDefined();
    expect(batch).toBeDefined();

    expect(block!.transactions).toHaveLength(1);

    expect(block!.transactions[0].status.toBoolean()).toBe(true);
    expect(block!.transactions[0].statusMessage).toBe(undefined);

    expect(batch!.blockHashes).toHaveLength(1);
    expect(batch!.proof.proof).toBe(MOCK_PROOF);

    const supplyPath = Path.fromProperty(
      "Balance",
      "totalSupply",
      PROTOKIT_PREFIXES.STATE_RUNTIME
    );
    const newState = await test.getState(supplyPath, "block");

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

    const newBalance = await test.getState(balancesPath, "block");

    expect(newBalance).toBeDefined();
    expect(UInt64.fromFields(newBalance!)).toStrictEqual(UInt64.from(200));
  }, 360_000);

  it("regression - should produce block with no STs emitted", async () => {
    const privateKey = PrivateKey.random();

    await test.addTransaction({
      method: ["NoopRuntime", "emittingNoSTs"],
      privateKey,
      args: [],
    });

    const block = await test.produceBlock();

    expect(block).toBeDefined();

    expect(block!.transactions).toHaveLength(1);
    expect(block!.transactions[0].status.toBoolean()).toBe(true);
    expect(block!.transactions[0].statusMessage).toBeUndefined();

    expect(
      block!.transactions[0].stateTransitions[0].stateTransitions
    ).toHaveLength(2);
    expect(
      block!.transactions[0].stateTransitions[1].stateTransitions
    ).toHaveLength(0);

    const batch = await test.produceBatch();

    expect(batch).toBeDefined();

    expect(batch!.blockHashes).toHaveLength(1);
    expect(batch!.proof.proof).toBe(MOCK_PROOF);
  }, 30000);

  it("events - should produce block with the right events", async () => {
    log.setLevel("TRACE");

    const privateKey = PrivateKey.random();

    await test.addTransaction({
      method: ["EventMaker", "makeEvent"],
      privateKey,
      args: [],
    });

    const firstExpectedEvent = {
      eventType: PrimaryTestEvent,
      event: new PrimaryTestEvent({
        message: Bool(false),
      }),
      eventName: "primary",
    };

    const secondExpectedEvent = {
      eventType: SecondaryTestEvent,
      event: new SecondaryTestEvent({
        message: Bool(true),
      }),
      eventName: "secondary",
    };
    const firstEventReduced = {
      eventName: firstExpectedEvent.eventName,
      data: firstExpectedEvent.eventType.toFields(firstExpectedEvent.event),
      source: "runtime",
    };

    const secondEventReduced = {
      eventName: secondExpectedEvent.eventName,
      data: secondExpectedEvent.eventType.toFields(secondExpectedEvent.event),
      source: "runtime",
    };

    const block = await test.produceBlock();

    expect(block).toBeDefined();

    expect(block!.transactions).toHaveLength(1);
    expect(block!.transactions[0].events).toHaveLength(2);
    expect(block!.transactions[0].events[0]).toStrictEqual(firstEventReduced);
    expect(block!.transactions[0].events[1]).toStrictEqual(secondEventReduced);

    const batch = await test.produceBatch();

    expect(batch).toBeDefined();

    expect(batch!.blockHashes).toHaveLength(1);
    expect(batch!.proof.proof).toBe(MOCK_PROOF);
  }, 30000);
});
