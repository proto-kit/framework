import { Field, FlexibleProvable, Poseidon, Proof } from "o1js";
import { container } from "tsyringe";
import {
  StateTransition,
  DefaultProvableHashList,
  ProvableStateTransition,
  MethodPublicOutput,
  RuntimeMethodExecutionContext,
} from "@proto-kit/protocol";
import {
  DecoratedMethod,
  toProver,
  ZkProgrammable,
  ToFieldable,
} from "@proto-kit/common";

import type { RuntimeModule } from "../runtime/RuntimeModule.js";
import { MethodIdResolver } from "../runtime/MethodIdResolver";

const errors = {
  runtimeNotProvided: (name: string) =>
    new Error(`Runtime was not provided for module: ${name}`),

  methodInputsNotProvided: () =>
    new Error(
      "Method execution inputs not provided, provide them via context.inputs"
    ),

  runtimeNameNotSet: () => new Error("Runtime name was not set"),

  fieldNotConstant: (name: string) =>
    new Error(
      `In-circuit field ${name} not a constant, this is likely a framework bug`
    ),
};

export function toStateTransitionsHash(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stateTransitions: StateTransition<any>[]
) {
  const stateTransitionsHashList = new DefaultProvableHashList(
    ProvableStateTransition
  );

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
export type WrappedMethod = (...args: unknown[]) => MethodPublicOutput;

export function toWrappedMethod(
  this: RuntimeModule<unknown>,
  methodName: string,
  moduleMethod: (...args: unknown[]) => unknown,
  methodArguments: ToFieldable[]
) {
  const executionContext = container.resolve<RuntimeMethodExecutionContext>(
    RuntimeMethodExecutionContext
  );

  const wrappedMethod: WrappedMethod = (...args): MethodPublicOutput => {
    Reflect.apply(moduleMethod, this, args);
    const {
      result: { stateTransitions, status },
      input,
    } = executionContext.current();

    const stateTransitionsHash = toStateTransitionsHash(stateTransitions);

    if (input === undefined) {
      throw errors.methodInputsNotProvided();
    }

    const { name, runtime } = this;

    if (name === undefined) {
      throw errors.runtimeNameNotSet();
    }
    if (runtime === undefined) {
      throw errors.runtimeNotProvided(name);
    }

    // Assert that the given transaction has the correct methodId
    const { methodIdResolver } = runtime;
    const thisMethodId = Field(methodIdResolver.getMethodId(name, methodName));
    if (!thisMethodId.isConstant()) {
      throw errors.fieldNotConstant("methodId");
    }

    input.transaction.methodId.assertEquals(
      thisMethodId,
      "Runtimemethod called with wrong methodId on the transaction object"
    );

    const parameterTypes: FlexibleProvable<unknown>[] = Reflect.getMetadata(
      "design:paramtypes",
      this,
      methodName
    );

    /**
     * Use the type info obtained previously to convert
     * the args passed to fields
     */
    const argsFields = args.flatMap((argument, index) => {
      if (argument instanceof Proof) {
        return [
          ...argument.publicInput?.toFields(),
          ...argument.publicOutput?.toFields(),
        ];
      } else {
        return parameterTypes[index].toFields(argument as any);
      }
    });

    // Assert that the argsHash that has been signed matches the given arguments
    // We can use js-if here, because methodArguments is statically sizes
    // i.e. the result of the if-statement will be the same for all executions
    // of this method
    const argsHash =
      methodArguments.length > 0 ? Poseidon.hash(argsFields) : Field(0);

    input.transaction.argsHash.assertEquals(
      argsHash,
      "argsHash and therefore arguments of transaction and runtime call does not match"
    );

    const transactionHash = input.transaction.hash();
    const networkStateHash = input.networkState.hash();

    return new MethodPublicOutput({
      stateTransitionsHash,
      status,
      transactionHash,
      networkStateHash,
    });
  };

  Object.defineProperty(wrappedMethod, "name", {
    value: `wrapped_${methodName}`,
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

export const runtimeMethodMetadataKey = "yab-method";
export const runtimeMethodNamesMetadataKey = "proto-kit-runtime-methods";

/**
 * Checks the metadata of the provided runtime module and its method,
 * to see if it has been decorated with @runtimeMethod()
 *
 * @param target - Runtime module to check
 * @param propertyKey - Name of the method to check in the prior runtime module
 * @returns - If the provided method name is a runtime method or not
 */
export function isRuntimeMethod(
  target: RuntimeModule<unknown>,
  propertyKey: string
) {
  return Boolean(
    Reflect.getMetadata(runtimeMethodMetadataKey, target, propertyKey)
  );
}

export function runtimeMethod() {
  return (
    target: RuntimeModule<unknown>,
    methodName: string,
    descriptor: PropertyDescriptor
  ) => {
    const executionContext = container.resolve<RuntimeMethodExecutionContext>(
      RuntimeMethodExecutionContext
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    let data: string[] | undefined = Reflect.getMetadata(
      runtimeMethodNamesMetadataKey,
      target
    );
    if (data !== undefined) {
      data.push(methodName);
    } else {
      data = [methodName];
    }
    Reflect.defineMetadata(runtimeMethodNamesMetadataKey, data, target);

    Reflect.defineMetadata(runtimeMethodMetadataKey, true, target, methodName);

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const simulatedMethod = descriptor.value as DecoratedMethod;

    descriptor.value = function value(
      this: RuntimeModule<unknown>,
      ...args: ToFieldable[]
    ) {
      const constructorName = this.constructor.name;

      /**
       * If its a top level method call, wrap it into a wrapped method,
       * since it'll be turned into a real/mock prover in provableMethod().
       *
       * Otherwise provableMethod() will just call the originalMethod provided
       * if method is not called at the top level.
       */
      const simulatedWrappedMethod = Reflect.apply(toWrappedMethod, this, [
        methodName,
        simulatedMethod,
        args,
      ]);

      /**
       * Before the prover runs, make sure it is operating on the correct
       * RuntimeMethodExecutionContext state, meaning it enters and exits
       * the context properly.
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async function prover(this: ZkProgrammable<any, any>) {
        executionContext.beforeMethod(constructorName, methodName, args);
        const innerProver = toProver(
          combineMethodName(constructorName, methodName),
          simulatedWrappedMethod,
          false,
          ...args
        ).bind(this);
        // eslint-disable-next-line @typescript-eslint/init-declarations
        let result: Awaited<ReturnType<typeof innerProver>>;
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          result = await Reflect.apply(innerProver, this, args);
        } finally {
          executionContext.afterMethod();
        }

        return result;
      }

      executionContext.beforeMethod(constructorName, methodName, args);

      if (executionContext.isTopLevel) {
        if (!this.runtime) {
          throw errors.runtimeNotProvided(constructorName);
        }
        executionContext.setProver(prover.bind(this.runtime.zkProgrammable));
      }

      // eslint-disable-next-line @typescript-eslint/init-declarations
      let result: unknown;
      try {
        result = Reflect.apply(simulatedMethod, this, args);
      } finally {
        executionContext.afterMethod();
      }

      return result;
    };
  };
}
