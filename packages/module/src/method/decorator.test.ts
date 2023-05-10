/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable new-cap */
import 'reflect-metadata';

import { Bool, Field } from 'snarkyjs';
import { container } from 'tsyringe';
import { jest } from '@jest/globals';

import { ProvableOption } from '../option/Option.js';
import { RuntimeModule } from '../runtime/RuntimeModule.js';
import { ProvableStateTransition } from '../stateTransition/StateTransition.js';

import {
  MethodPublicInput,
  runInContext,
  toStateTransitionsHash,
  toWrappedMethod,
  type WrappedMethod,
  type DecoratedMethod,
} from './decorator.js';
import { MethodExecutionContext } from './MethodExecutionContext.js';

const executionContext = container.resolve(MethodExecutionContext);
// eslint-disable-next-line @typescript-eslint/naming-convention
const expectedStatus = false;
const expectedErrorMessage = 'test failure';
const argument = 5;

class TestModule extends RuntimeModule {
  public succeed(foo: number) {
    executionContext.setStatus(Bool(expectedStatus));
    executionContext.addStateTransition(
      ProvableStateTransition.from(
        Field(0),
        new ProvableOption({
          isSome: Bool(false),
          value: Field(0),
        })
      )
    );

    return foo;
  }

  public fail() {
    throw new Error(expectedErrorMessage);
  }
}

describe('runInContext', () => {
  describe('context capture', () => {
    it('should run a module method and capture its execution context', () => {
      expect.assertions(4);

      const {
        isFinished,
        result: { stateTransitions, status, value },
      } = Reflect.apply(runInContext, new TestModule(), [
        TestModule.prototype.succeed.name,
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, jest/unbound-method, @typescript-eslint/unbound-method
        TestModule.prototype.succeed as DecoratedMethod,
        [argument],
      ]);

      expect(status.toBoolean()).toBe(expectedStatus);
      expect(stateTransitions).toHaveLength(1);
      expect(value).toBe(argument);
      expect(isFinished).toBe(true);
    });

    it('should throw if the underlying method throws', () => {
      expect.assertions(1);

      expect(() =>
        Reflect.apply(runInContext, new TestModule(), [
          TestModule.prototype.fail.name,
          // eslint-disable-next-line max-len
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, jest/unbound-method, @typescript-eslint/unbound-method
          TestModule.prototype.fail as DecoratedMethod,
          [],
        ])
      ).toThrow(expectedErrorMessage);
    });
  });
});

describe('toStateTransitionsHash', () => {
  const noneStateTransition = ProvableStateTransition.from(
    Field(0),
    new ProvableOption({
      isSome: Bool(false),
      value: Field(0),
    })
  );

  const someStateTransition = ProvableStateTransition.from(
    Field(0),
    new ProvableOption({
      isSome: Bool(true),
      value: Field(0),
    })
  );

  it.each([
    [
      [noneStateTransition],
      '28700990035644272452675388662126894299960937130710765880529427081589503828331',
    ],
    [
      [someStateTransition],
      '7067243248312463521220230733411703436580237248681301130001246160136823979683',
    ],
    [
      [noneStateTransition, someStateTransition],
      '28458214243854583778615841476196144689845750038158080909909060271139292999680',
    ],
    [
      [someStateTransition, noneStateTransition],
      '21526494869688446131100082736844562554912979238021219726622697559317856146482',
    ],
  ])(
    'should calculate a hash of all provided state transitions',
    (stateTransitions, expectedHash) => {
      expect.assertions(1);

      const hash = toStateTransitionsHash(stateTransitions).toString();

      expect(hash).toBe(expectedHash);
    }
  );
});

describe('toWrappedMethod', () => {
  // eslint-disable-next-line @typescript-eslint/init-declarations
  let wrappedMethod: WrappedMethod;

  beforeAll(() => {
    jest.spyOn(TestModule.prototype, 'succeed');

    wrappedMethod = Reflect.apply(toWrappedMethod, new TestModule(), [
      TestModule.prototype.succeed.name,
      // eslint-disable-next-line max-len
      // eslint-disable-next-line jest/unbound-method, @typescript-eslint/consistent-type-assertions, @typescript-eslint/unbound-method
      TestModule.prototype.succeed as DecoratedMethod,
    ]);
  });

  it('should return a wrapped method that calls the module method when invoked', () => {
    expect.assertions(1);

    const {
      result: { stateTransitions, status },
    } = Reflect.apply(runInContext, new TestModule(), [
      TestModule.prototype.succeed.name,
      // eslint-disable-next-line max-len
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, jest/unbound-method, @typescript-eslint/unbound-method
      TestModule.prototype.succeed as DecoratedMethod,
      [argument],
    ]);

    const publicInput: MethodPublicInput = new MethodPublicInput({
      stateTransitionsHash: toStateTransitionsHash(stateTransitions),
      status,
      transactionHash: Field(0),
    });

    wrappedMethod(publicInput);

    // once to precompute, once during wrappedMethod
    expect(jest.mocked(TestModule.prototype.succeed)).toHaveBeenCalledTimes(2);
  });

  it('should fail if the public input does not match the in-circuit execution values', () => {
    expect.assertions(1);

    const publicInput: MethodPublicInput = new MethodPublicInput({
      stateTransitionsHash: Field(0),
      status: Bool(true),
      transactionHash: Field(0),
    });

    expect(() => {
      wrappedMethod(publicInput);
    }).toThrow(/not consistent through multiple method executions/u);
  });
});
