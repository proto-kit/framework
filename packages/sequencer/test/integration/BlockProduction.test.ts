import { log, range, MOCK_PROOF, mapSequential } from "@proto-kit/common";
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
} from "@proto-kit/protocol";
import { AppChain } from "@proto-kit/sdk";
import { Bool, Field, PrivateKey, PublicKey, Struct, UInt64 } from "o1js";
import "reflect-metadata";
import { container } from "tsyringe";

import { BatchStorage, HistoricalBatchStorage, Sequencer } from "../../src";
import {
  DefaultTestingSequencerModules,
  testingSequencerFromModules,
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
    // container.reset();

    log.setLevel(log.levels.DEBUG);

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
        BatchProducerModule: {},
        BlockProducerModule: {},
        LocalTaskWorkerModule: {},
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

    ({ runtime, sequencer, protocol } = app);

    test = app.sequencer.dependencyContainer.resolve(BlockTestService);
  });

  it("should produce a dummy block proof", async () => {
    expect.assertions(25);

    log.setLevel("TRACE");

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

    expect(block!.transactions[0].stateTransitions).toHaveLength(1);
    expect(block!.transactions[0].protocolTransitions).toHaveLength(2);

    const latestBlockWithResult = await sequencer
      .resolve("BlockQueue")
      .getLatestBlock();

    let batch = await test.produceBatch();

    expect(batch).toBeDefined();

    expect(batch!.blockHashes).toHaveLength(1);
    expect(batch!.proof.proof).toBe(MOCK_PROOF);

    expect(
      latestBlockWithResult!.result.afterNetworkState.hash().toString()
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
    const newState = await test.getState(balancesPath, "batch");
    const newUnprovenState = await test.getState(balancesPath, "block");

    expect(newState).toBeDefined();
    expect(newUnprovenState).toBeDefined();
    expect(UInt64.fromFields(newState!).toString()).toStrictEqual("100");
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
    const newAccountState = await test.getState(accountStatePath, "batch");

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
    console.log(block!.transactions[0]);
    console.log(block!.transactions[0].statusMessage);
    expect(block!.transactions[0].status.toBoolean()).toBe(true);
    expect(block!.transactions[0].statusMessage).toBeUndefined();

    expect(batch!.blockHashes).toHaveLength(1);
    expect(batch!.proof.proof).toBe(MOCK_PROOF);

    const state2 = await test.getState(balancesPath, "batch");

    expect(state2).toBeDefined();
    expect(UInt64.fromFields(state2!)).toStrictEqual(UInt64.from(200));
  }, 60_000);

  it("should reject tx and not apply the state", async () => {
    expect.assertions(5);

    log.setLevel("INFO");

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

  const numberTxs = 3;

  it("should produce block with multiple transaction", async () => {
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

      const transitions = block!.transactions[index].stateTransitions;

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
    const newState = await test.getState(balancesPath, "batch");

    expect(newState).toBeDefined();
    expect(UInt64.fromFields(newState!)).toStrictEqual(
      UInt64.from(100 * numberTxs)
    );
  }, 160_000);

  it("should produce a block with a mix of failing and succeeding transactions and empty blocks", async () => {
    expect.assertions(7);

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

    expect(block).toBeDefined();

    expect(batch!.blockHashes).toHaveLength(2);
    expect(block!.transactions).toHaveLength(2);

    const balanceModule = runtime.resolve("Balance");
    const balancesPath1 = Path.fromKey(
      balanceModule.balances.path!,
      balanceModule.balances.keyType,
      pk1.toPublicKey()
    );
    const newState1 = await test.getState(balancesPath1, "batch");

    expect(newState1).toBeUndefined();

    const balancesPath2 = Path.fromKey(
      balanceModule.balances.path!,
      balanceModule.balances.keyType,
      pk2.toPublicKey()
    );
    const newState2 = await test.getState(balancesPath2, "batch");

    expect(newState2).toBeDefined();
    expect(UInt64.fromFields(newState2!)).toStrictEqual(UInt64.from(100));

    await test.produceBlock();
    await test.produceBlock();
    const proven2 = await test.produceBatch();

    expect(proven2?.blockHashes.length).toBe(2);
  }, 720_000);

  // TODO Test with batch that only consists of empty blocks

  it.skip.each([
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

    const supplyPath = Path.fromProperty("Balance", "totalSupply");
    const newState = await test.getState(supplyPath, "batch");

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

    const newBalance = await test.getState(balancesPath, "batch");

    expect(newBalance).toBeDefined();
    expect(UInt64.fromFields(newBalance!)).toStrictEqual(UInt64.from(200));
  }, 360_000);

  it("regression - should produce block with no STs emitted", async () => {
    log.setLevel("TRACE");

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

    expect(block!.transactions[0].stateTransitions).toHaveLength(0);
    expect(block!.transactions[0].protocolTransitions).toHaveLength(2);

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
    };

    const secondEventReduced = {
      eventName: secondExpectedEvent.eventName,
      data: secondExpectedEvent.eventType.toFields(secondExpectedEvent.event),
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
