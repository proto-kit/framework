/* eslint-disable new-cap */
/* eslint-disable import/no-unused-modules */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import { Bool, Field, Struct } from 'snarkyjs';
import { container } from 'tsyringe';

import type { RuntimeModule } from '../runtime/RuntimeModule.js';
import {
  ProvableStateTransition,
  type StateTransition,
} from '../stateTransition/StateTransition.js';
import { HashList } from '../utils/HashList.js';

import { MethodExecutionContext } from './MethodExecutionContext.js';

/**
 * Public input used to link in-circuit execution with
 * the proof's public input.
 */
export class MethodPublicInput extends Struct({
  stateTransitionsHash: Field,
  status: Bool,
  transactionHash: Field,
}) {}

/**
 * Runs a method wrapped in a method execution context.
 */
// eslint-disable-next-line max-params
export function runInContext(
  this: RuntimeModule,
  methodName: string,
  moduleMethod: (...args: unknown[]) => unknown,
  args: unknown[]
) {
  const executionContext = container.resolve<
    MethodExecutionContext<ReturnType<typeof moduleMethod>>
  >(MethodExecutionContext);

  // eslint-disable-next-line @typescript-eslint/init-declarations
  let resultValue: unknown;

  executionContext.beforeMethod(methodName);
  try {
    resultValue = Reflect.apply(moduleMethod, this, args);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    throw new Error(error);
  } finally {
    executionContext.afterMethod();
  }

  executionContext.setValue(resultValue);

  return executionContext.current();
}

export function toStateTransitionsHash(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stateTransitions: StateTransition<any>[]
) {
  const stateTransitionsHashList = HashList.fromType(ProvableStateTransition);

  return stateTransitions
    .map((stateTransition) => stateTransition.toProvable())
    .reduce(
      (allStateTransitionsHashList, stateTransition) =>
        allStateTransitionsHashList.push(stateTransition),
      stateTransitionsHashList
    )
    .toField();
}

// eslint-disable-next-line etc/prefer-interface
export type WrappedMethod = (
  publicInput: MethodPublicInput,
  ...args: unknown[]
) => unknown;

export function toWrappedMethod(
  this: RuntimeModule,
  methodName: string,
  moduleMethod: (...args: unknown[]) => unknown
) {
  const wrappedMethod: WrappedMethod = (publicInput, ...args) => {
    const {
      result: { stateTransitions, status, value },
    } = Reflect.apply(runInContext, this, [methodName, moduleMethod, args]);

    const stateTransitionsHash = toStateTransitionsHash(stateTransitions);

    publicInput.stateTransitionsHash.assertEquals(
      stateTransitionsHash,
      `State transitions produced by '@method ${methodName}' are not consistent through multiple method executions, does your method contain any circuit-unfriendly conditional logic?`
    );
    // eslint-disable-next-line no-warning-comments
    // TODO: implement the transactionHash commitment
    publicInput.transactionHash.assertEquals(Field(0));
    publicInput.status.assertEquals(
      status,
      `Execution status of '@method ${methodName}' differs across multiple method executions, does your status change by any circuit-unfriendly conditional logic?`
    );

    return value;
  };

  Object.defineProperty(wrappedMethod, 'name', {
    value: `wrapped_${methodName}`,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    writable: false,
  });

  return wrappedMethod;
}

export function combineMethodName(
  runtimeModuleName: string,
  methodName: string
) {
  return `${runtimeModuleName}.${methodName}`;
}

/**
 * Precomputes the public inputs required to run
 * an actual wrapped method, produced from the provided moduleMethod.
 *
 * Execute the wrapped method with the precomputed public inputs.
 */
// eslint-disable-next-line max-params, max-statements
export function runWithCommitments(
  this: RuntimeModule,
  methodName: string,
  moduleMethod: (...args: unknown[]) => unknown,
  args: unknown[]
) {
  const executionContext = container.resolve<
    MethodExecutionContext<ReturnType<typeof moduleMethod>>
  >(MethodExecutionContext);

  const wrappedMethod = Reflect.apply(toWrappedMethod, this, [
    methodName,
    moduleMethod,
  ]);

  const {
    result: { stateTransitions, status },
  } = Reflect.apply(runInContext, this, [methodName, moduleMethod, args]);

  const stateTransitionsHash = toStateTransitionsHash(stateTransitions);

  const methodPublicInput: MethodPublicInput = {
    stateTransitionsHash,
    transactionHash: Field(0),
    status,
  };

  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (this.chain?.areProofsEnabled) {
    const runtimeModuleName = this.constructor.name;
    const combinedMethodName = combineMethodName(runtimeModuleName, methodName);
    const provableMethod = this.chain?.program?.[combinedMethodName];

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!provableMethod) {
      throw new Error(
        `Unable to find a provable method for '@method ${methodName}', did you forget to run chain.compile()?`
      );
    }

    const prove = async () =>
      // eslint-disable-next-line max-len
      // eslint-disable-next-line @typescript-eslint/return-await, @typescript-eslint/no-unsafe-argument
      await Reflect.apply(provableMethod, this, [methodPublicInput, ...args]);

    executionContext.setProve(prove);
  }

  return wrappedMethod(methodPublicInput, ...args);
}

export const methodMetadataKey = 'yab-method';

/**
 * Checks the metadata of the provided runtime module and its method,
 * to see if it has been decorated with @method()
 *
 * @param target - Runtime module to check
 * @param propertyKey - Name of the method to check in the prior runtime module
 * @returns - If the provided method name is a runtime method or not
 */
export function isMethod(target: RuntimeModule, propertyKey: string) {
  return Boolean(Reflect.getMetadata(methodMetadataKey, target, propertyKey));
}

// eslint-disable-next-line etc/prefer-interface
export type DecoratedMethod = (...args: unknown[]) => unknown;

/**
 * Decorates a runtime module method and toggles execution of
 * either of its variants, depending on the state of the current
 * method execution context. If the method is called at the 'top-level',
 * it is executed 'with commitments'. If the method is called from another
 * method, it's executed directly.
 *
 * Additionally the method is marked with metadata as a 'runtime module method'.
 *
 * @returns A decorated runtime module method
 */
export function method() {
  return (
    target: RuntimeModule,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) => {
    const executionContext = container.resolve<MethodExecutionContext<unknown>>(
      MethodExecutionContext
    );

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const originalFunction = descriptor.value as DecoratedMethod;

    Reflect.defineMetadata(methodMetadataKey, true, target, propertyKey);
    descriptor.value = function value(this: RuntimeModule, ...args: unknown[]) {
      if (executionContext.isTopLevel) {
        return Reflect.apply(runWithCommitments, this, [
          propertyKey,
          originalFunction,
          args,
        ]);
      }

      return Reflect.apply(originalFunction, this, args);
    };
  };
}
