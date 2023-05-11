/* eslint-disable new-cap */
/* eslint-disable @typescript-eslint/naming-convention */
import 'reflect-metadata';
import { Field, Poseidon, PrivateKey, PublicKey, UInt64 } from 'snarkyjs';
import { container } from 'tsyringe';

import type { ProvableStateTransition } from '../../src/stateTransition/StateTransition.js';
import { Path } from '../../src/path/Path.js';
import { State } from '../../src/state/State.js';
import { Chain } from '../../src/chain/Chain.js';
import { MethodExecutionContext } from '../../src/method/MethodExecutionContext.js';

import { Admin } from './Admin.js';
import { Balances } from './Balances.js';
import {
  InMemoryStateService,
  StateService,
} from '../../src/state/InMemoryStateService.js';

describe('balances', () => {
  // eslint-disable-next-line @typescript-eslint/init-declarations
  let balances: Balances;

  // eslint-disable-next-line @typescript-eslint/init-declarations
  let state: StateService;

  // eslint-disable-next-line @typescript-eslint/init-declarations
  let chain: Chain<{
    Balances: typeof Balances;
    Admin: typeof Admin;
  }>;

  function getStateValue(path: Field | undefined) {
    if (!path) {
      throw new Error('Path not found');
    }

    const stateValue = state.get(path);

    if (!stateValue) {
      throw new Error('stateValue is undefined');
    }

    return stateValue;
  }

  function createChain() {
    state = new InMemoryStateService();

    chain = Chain.from({
      state,

      runtimeModules: {
        Balances,
        Admin,
      },
    });

    balances = chain.getRuntimeModule('Balances');

    state.set(
      balances.totalSupply.path!,
      State.dummyValue<UInt64>(UInt64).toFields()
    );
  }

  describe('compile and prove', () => {
    beforeAll(createChain);

    afterAll(() => {
      chain.disableProofs();
    });

    // eslint-disable-next-line max-statements
    it.skip('should compile and prove a method execution', async () => {
      expect.assertions(3);

      const executionContext = container.resolve(MethodExecutionContext);
      const expectedStateTransitionsHash =
        '7497547498540883824706737360758356065880487193468389816528185336915078444781';
      const expectedStatus = true;

      chain.enableProofs();
      await chain.compile();

      balances.getTotalSupply();

      const { result } = executionContext.current();
      const { prove } = result;

      const proof = await prove?.();

      // eslint-disable-next-line jest/no-conditional-in-test
      if (!chain.program) {
        throw new Error('Program compilation has failed');
      }

      // eslint-disable-next-line jest/no-conditional-in-test
      if (!proof) {
        throw new Error('Proof generation has failed');
      }

      const verified = await chain.program.verify(proof);

      expect(verified).toBe(true);

      expect(proof.publicInput.stateTransitionsHash.toString()).toStrictEqual(
        expectedStateTransitionsHash
      );
      expect(proof.publicInput.status.toBoolean()).toBe(expectedStatus);
    }, 60_000);
  });

  describe('getTotalSupply', () => {
    beforeAll(createChain);

    describe('state transitions', () => {
      // eslint-disable-next-line @typescript-eslint/init-declarations
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

      it('should return a single state transition', () => {
        expect.assertions(1);
        expect(stateTransitions).toHaveLength(1);
      });

      it('should have a state transition for the correct path', () => {
        expect.assertions(1);

        const path = Path.fromProperty('Balances', 'totalSupply');

        expect(stateTransitions[0].path.toString()).toStrictEqual(
          path.toString()
        );
      });

      it('should produce a from-only state transition', () => {
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
  });

  describe('setTotalSupply', () => {
    beforeAll(createChain);

    describe('state transitions', () => {
      // eslint-disable-next-line @typescript-eslint/init-declarations
      let stateTransitions: ProvableStateTransition[];

      beforeEach(() => {
        const executionContext = container.resolve(MethodExecutionContext);
        balances.setTotalSupply();

        // eslint-disable-next-line prefer-destructuring
        stateTransitions = executionContext
          .current()
          .result.stateTransitions.map((stateTransition) =>
            stateTransition.toProvable()
          );
      });

      it('should return a single state transition', () => {
        expect.assertions(1);
        expect(stateTransitions).toHaveLength(1);
      });

      it('should have a state transition for the correct path', () => {
        expect.assertions(1);

        const path = Path.fromProperty('Balances', 'totalSupply');

        expect(stateTransitions[0].path.toString()).toStrictEqual(
          path.toString()
        );
      });

      it('should produce a from-to state transition', () => {
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

  describe('getBalance', () => {
    beforeAll(createChain);

    describe('state transitions', () => {
      // eslint-disable-next-line @typescript-eslint/init-declarations
      let stateTransitions: ProvableStateTransition[];
      const address = PrivateKey.random().toPublicKey();

      beforeEach(() => {
        const executionContext = container.resolve(MethodExecutionContext);
        balances.getBalance(address);

        // eslint-disable-next-line prefer-destructuring
        stateTransitions = executionContext.current().result.stateTransitions;
      });

      it('should return a single state transition', () => {
        expect.assertions(1);
        expect(stateTransitions).toHaveLength(1);
      });

      it('should have a state transition for the correct path', () => {
        expect.assertions(1);

        const path = Path.fromKey<PublicKey>(
          Path.fromProperty('Balances', 'balances'),
          PublicKey,
          address
        );

        expect(stateTransitions[0].path.toString()).toStrictEqual(
          path.toString()
        );
      });

      it('should produce a from-only state transition, for non-existing state', () => {
        expect.assertions(3);

        const [stateTransition] = stateTransitions;

        expect(stateTransition.from.isSome.toBoolean()).toBe(false);
        expect(stateTransition.from.value.toString()).toBe(Field(0).toString());
        expect(stateTransition.to.isSome.toBoolean()).toBe(false);
      });
    });
  });
});
