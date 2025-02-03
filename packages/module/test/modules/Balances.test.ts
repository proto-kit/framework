import "reflect-metadata";
import { Field, Poseidon, PrivateKey, Proof, PublicKey, UInt64 } from "o1js";
import { container } from "tsyringe";
import {
  type ProvableStateTransition,
  Path,
  MethodPublicOutput,
  SimpleAsyncStateService,
  RuntimeMethodExecutionContext,
  RuntimeTransaction,
  NetworkState,
} from "@proto-kit/protocol";

import { Runtime } from "../../src";
import { createTestingRuntime } from "../TestingRuntime";

import { Balances } from "./Balances.js";
import { Admin } from "./Admin.js";

describe("balances", () => {
  let balances: Balances;

  let state: SimpleAsyncStateService;

  let runtime: Runtime<{
    Admin: typeof Admin;
    Balances: typeof Balances;
  }>;

  async function getStateValue(path: Field | undefined) {
    if (!path) {
      throw new Error("Path not found");
    }

    const stateValue = await state.get(path);

    if (!stateValue) {
      throw new Error("stateValue is undefined");
    }

    return stateValue;
  }

  async function createChain() {
    ({ runtime, state } = createTestingRuntime(
      {
        Balances,
        Admin,
      },
      {
        Admin: {
          publicKey: PublicKey.empty<typeof PublicKey>().toBase58(),
        },

        Balances: {},
      }
    ));

    balances = runtime.resolve("Balances");

    await state.set(balances.totalSupply.path!, UInt64.from(10).toFields());
  }

  describe.skip("compile and prove", () => {
    beforeAll(createChain);

    // Disabled until we implement a mechanism to enable/disable compiling tests
    it("should compile and prove a method execution", async () => {
      expect.assertions(3);

      runtime.zkProgrammable.areProofsEnabled?.setProofsEnabled(true);

      const executionContext = container.resolve(RuntimeMethodExecutionContext);
      executionContext.setup({
        transaction: RuntimeTransaction.dummyTransaction(),
        networkState: NetworkState.empty(),
      });

      const expectedStateTransitionsHash =
        "1439144406936083177718146178121957896974210157062549589517697792374542035761";
      const expectedStatus = true;

      await runtime.zkProgrammable.zkProgram[0].compile();

      await balances.getTotalSupply();

      const { result } = executionContext.current();

      const proof = await result.prove<Proof<undefined, MethodPublicOutput>>();

      const verified = await runtime.zkProgrammable.zkProgram[0].verify(proof);

      runtime.zkProgrammable.areProofsEnabled?.setProofsEnabled(false);

      expect(verified).toBe(true);

      expect(proof.publicOutput.stateTransitionsHash.toString()).toStrictEqual(
        expectedStateTransitionsHash
      );
      expect(proof.publicOutput.status.toBoolean()).toBe(expectedStatus);
    }, 180_000);
  });

  describe("getTotalSupply", () => {
    beforeAll(createChain);

    describe("state transitions", () => {
      let stateTransitions: ProvableStateTransition[];

      beforeEach(async () => {
        const executionContext = container.resolve(
          RuntimeMethodExecutionContext
        );
        executionContext.setup({
          transaction: RuntimeTransaction.dummyTransaction(),
          networkState: NetworkState.empty(),
        });
        await balances.getTotalSupply();

        stateTransitions = executionContext
          .current()
          .result.stateTransitions.map((stateTransition) =>
            stateTransition.toProvable()
          );
      });

      it("should return a single state transition", () => {
        expect.assertions(1);
        expect(stateTransitions).toHaveLength(1);
      });

      it("should have a state transition for the correct path", () => {
        expect.assertions(1);

        const path = Path.fromProperty("Balances", "totalSupply");

        expect(stateTransitions[0].path.toString()).toStrictEqual(
          path.toString()
        );
      });

      it("should produce a from-only state transition", async () => {
        expect.assertions(3);

        const [stateTransition] = stateTransitions;

        const value = UInt64.fromFields(
          await getStateValue(balances.totalSupply.path)
        );
        const treeValue = Poseidon.hash(value.toFields());

        expect(stateTransition.from.isSome.toBoolean()).toBe(true);
        expect(stateTransition.from.value.toString()).toBe(
          treeValue.toString()
        );
        expect(stateTransition.to.isSome.toBoolean()).toBe(false);
      });
    });

    describe("state transitions from empty state", () => {
      let stateTransitions: ProvableStateTransition[];

      beforeAll(async () => {
        await createChain();

        await state.set(balances.totalSupply.path!, undefined);
      });

      beforeEach(async () => {
        const executionContext = container.resolve(
          RuntimeMethodExecutionContext
        );
        executionContext.setup({
          transaction: RuntimeTransaction.dummyTransaction(),
          networkState: NetworkState.empty(),
        });

        await balances.getTotalSupply();

        stateTransitions = executionContext
          .current()
          .result.stateTransitions.map((stateTransition) =>
            stateTransition.toProvable()
          );
      });

      it("should return a single state transition", () => {
        expect.assertions(1);
        expect(stateTransitions).toHaveLength(1);
      });

      it("should have a state transition for the correct path", () => {
        expect.assertions(1);

        const path = Path.fromProperty("Balances", "totalSupply");

        expect(stateTransitions[0].path.toString()).toStrictEqual(
          path.toString()
        );
      });

      it("should produce a from-only state transition", () => {
        expect.assertions(3);

        const [stateTransition] = stateTransitions;

        const treeValue = Field(0);

        expect(stateTransition.from.isSome.toBoolean()).toBe(true);
        expect(stateTransition.from.value.toString()).toBe(
          treeValue.toString()
        );
        expect(stateTransition.to.isSome.toBoolean()).toBe(false);
      });
    });
  });

  describe("setTotalSupply", () => {
    beforeAll(createChain);

    describe("state transitions", () => {
      let stateTransitions: ProvableStateTransition[];

      beforeEach(async () => {
        const executionContext = container.resolve(
          RuntimeMethodExecutionContext
        );
        executionContext.setup({
          transaction: RuntimeTransaction.dummyTransaction(),
          networkState: NetworkState.empty(),
        });

        await balances.setTotalSupply();

        stateTransitions = executionContext
          .current()
          .result.stateTransitions.map((stateTransition) =>
            stateTransition.toProvable()
          );
      });

      it("should return a single state transition", () => {
        expect.assertions(1);
        expect(stateTransitions).toHaveLength(1);
      });

      it("should have a state transition for the correct path", () => {
        expect.assertions(1);

        const path = Path.fromProperty("Balances", "totalSupply");

        expect(stateTransitions[0].path.toString()).toStrictEqual(
          path.toString()
        );
      });

      it("should produce a from-to state transition", async () => {
        expect.assertions(4);

        const [stateTransition] = stateTransitions;
        const fromValue = UInt64.fromFields(
          await getStateValue(balances.totalSupply.path)
        );
        const fromTreeValue = Poseidon.hash(fromValue.toFields());

        const toValue = UInt64.from(20);
        const toTreeValue = Poseidon.hash(toValue.toFields());

        expect(stateTransition.from.isSome.toBoolean()).toBe(true);
        expect(stateTransition.from.value.toString()).toBe(
          fromTreeValue.toString()
        );

        expect(stateTransition.to.isSome.toBoolean()).toBe(true);
        expect(stateTransition.to.value.toString()).toBe(
          toTreeValue.toString()
        );
      });
    });
  });

  describe("getBalance", () => {
    beforeAll(createChain);

    describe("state transitions", () => {
      let stateTransitions: ProvableStateTransition[];
      const address = PrivateKey.random().toPublicKey();

      beforeEach(async () => {
        const executionContext = container.resolve(
          RuntimeMethodExecutionContext
        );
        executionContext.setup({
          transaction: RuntimeTransaction.dummyTransaction(),
          networkState: NetworkState.empty(),
        });

        await balances.getBalance(address);

        stateTransitions = executionContext
          .current()
          .result.stateTransitions.map((stateTransition) =>
            stateTransition.toProvable()
          );
      });

      it("should return a single state transition", () => {
        expect.assertions(1);
        expect(stateTransitions).toHaveLength(1);
      });

      it("should have a state transition for the correct path", () => {
        expect.assertions(1);

        const path = Path.fromKey<PublicKey>(
          Path.fromProperty("Balances", "balances"),
          PublicKey,
          address
        );

        expect(stateTransitions[0].path.toString()).toStrictEqual(
          path.toString()
        );
      });

      it("should produce a from-only state transition, for non-existing state", () => {
        expect.assertions(3);

        const [stateTransition] = stateTransitions;

        expect(stateTransition.from.isSome.toBoolean()).toBe(true);
        expect(stateTransition.from.value.toString()).toBe(Field(0).toString());
        expect(stateTransition.to.isSome.toBoolean()).toBe(false);
      });
    });
  });
});
