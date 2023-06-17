/* eslint-disable max-lines */
import "reflect-metadata";
import { Bool, Field, Poseidon, PrivateKey, PublicKey, UInt64 } from "snarkyjs";
import { container } from "tsyringe";
import { type ProvableStateTransition, Path } from "@yab/protocol";
import { ModulesConfig } from "@yab/common";

import { MethodExecutionContext } from "../../src/method/MethodExecutionContext.js";
import {
  InMemoryStateService,
  StateService,
} from "../../src/state/InMemoryStateService.js";
import { Runtime } from "../../src";

import { Balances } from "./Balances.js";
import { Admin } from "./Admin.js";

describe("balances", () => {
  let balances: Balances;

  let state: StateService;

  let runtime: Runtime<
    {
      Admin: typeof Admin;
      Balances: typeof Balances;
    },
    ModulesConfig<{
      Admin: typeof Admin;
      Balances: typeof Balances;
    }>
  >;

  function getStateValue(path: Field | undefined) {
    if (!path) {
      throw new Error("Path not found");
    }

    const stateValue = state.get(path);

    if (!stateValue) {
      throw new Error("stateValue is undefined");
    }

    return stateValue;
  }

  function createChain() {
    state = new InMemoryStateService();

    runtime = Runtime.from({
      state,

      modules: {
        Admin,
        Balances,
      },
    });

    runtime.configure({
      Admin: {
        publicKey: PublicKey.empty().toBase58(),
      },

      Balances: {
        test: Bool(true),
      },
    });

    balances = runtime.resolve("Balances");

    state.set(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      balances.totalSupply.path!,
      UInt64.from(10).toFields()
    );
  }

  describe("compile and prove", () => {
    beforeAll(createChain);

    afterAll(() => {
      runtime.setProofsEnabled(false);
    });

    // Disabled until we implement a mechanism to enable/disable compiling tests
    it.skip("should compile and prove a method execution", async () => {
      expect.assertions(3);

      const executionContext = container.resolve(MethodExecutionContext);
      const expectedStateTransitionsHash =
        "1439144406936083177718146178121957896974210157062549589517697792374542035761";
      const expectedStatus = true;

      runtime.setProofsEnabled(true);
      runtime.precompile().toPretty();
      await runtime.compile();

      balances.getTotalSupply();

      const { result } = executionContext.current();
      const { prove } = result;

      const proof = await prove?.();

      // eslint-disable-next-line jest/no-conditional-in-test
      if (!runtime.program) {
        throw new Error("Program compilation has failed");
      }

      // eslint-disable-next-line jest/no-conditional-in-test
      if (!proof) {
        throw new Error("Proof generation has failed");
      }

      const verified = await runtime.program.verify(proof);

      expect(verified).toBe(true);

      expect(proof.publicInput.stateTransitionsHash.toString()).toStrictEqual(
        expectedStateTransitionsHash
      );
      expect(proof.publicInput.status.toBoolean()).toBe(expectedStatus);
    }, 180_000);
  });

  describe("getTotalSupply", () => {
    beforeAll(createChain);

    describe("state transitions", () => {
      let stateTransitions: ProvableStateTransition[];

      beforeEach(() => {
        const executionContext = container.resolve(MethodExecutionContext);
        balances.getTotalSupply();

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

        const value = UInt64.fromFields(
          getStateValue(balances.totalSupply.path)
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

      beforeAll(() => {
        createChain();
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        state.set(balances.totalSupply.path!, undefined);
      });

      beforeEach(() => {
        const executionContext = container.resolve(MethodExecutionContext);
        balances.getTotalSupply();

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

      beforeEach(() => {
        const executionContext = container.resolve(MethodExecutionContext);
        balances.setTotalSupply();

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

      it("should produce a from-to state transition", () => {
        expect.assertions(4);

        const [stateTransition] = stateTransitions;
        const fromValue = UInt64.fromFields(
          getStateValue(balances.totalSupply.path)
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

      beforeEach(() => {
        const executionContext = container.resolve(MethodExecutionContext);
        balances.getBalance(address);

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
