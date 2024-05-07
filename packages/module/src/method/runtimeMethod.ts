import { Bool, Field, Poseidon } from "o1js";
import { container } from "tsyringe";
import {
  StateTransition,
  ProvableStateTransition,
  MethodPublicOutput,
  RuntimeMethodExecutionContext,
  StateTransitionReductionList,
} from "@proto-kit/protocol";
import {
  DecoratedMethod,
  toProver,
  ZkProgrammable,
  ArgumentTypes,
} from "@proto-kit/common";

import type { RuntimeModule } from "../runtime/RuntimeModule.js";

import { MethodParameterEncoder } from "./MethodParameterEncoder";

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
  stateTransitions: StateTransition<any>[]
) {
  const stateTransitionsHashList = new StateTransitionReductionList(
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

export type WrappedMethod = (...args: ArgumentTypes) => MethodPublicOutput;
export type AsyncWrappedMethod = (
  ...args: ArgumentTypes
) => Promise<MethodPublicOutput>;

export function toWrappedMethod(
  this: RuntimeModule<unknown>,
  methodName: string,
  moduleMethod: (...args: ArgumentTypes) => Promise<any>,
  options: {
    invocationType: RuntimeMethodInvocationType;
  }
): AsyncWrappedMethod {
  const executionContext = container.resolve<RuntimeMethodExecutionContext>(
    RuntimeMethodExecutionContext
  );

  const wrappedMethod: AsyncWrappedMethod = async (
    ...args
  ): Promise<MethodPublicOutput> => {
    await Reflect.apply(moduleMethod, this, args);
    const {
      result: { stateTransitions, status },
    } = executionContext.current();

    const stateTransitionsHash = toStateTransitionsHash(stateTransitions);

    const { name, runtime } = this;

    if (name === undefined) {
      throw errors.runtimeNameNotSet();
    }
    if (runtime === undefined) {
      throw errors.runtimeNotProvided(name);
    }

    const { transaction, networkState } = executionContext.witnessInput();
    const { methodIdResolver } = runtime;

    // Assert that the given transaction has the correct methodId
    const thisMethodId = Field(methodIdResolver.getMethodId(name, methodName));
    if (!thisMethodId.isConstant()) {
      throw errors.fieldNotConstant("methodId");
    }

    transaction.methodId.assertEquals(
      thisMethodId,
      "Runtimemethod called with wrong methodId on the transaction object"
    );

    /**
     * Use the type info obtained previously to convert
     * the args passed to fields
     */
    const { argsFields } = MethodParameterEncoder.fromMethod(
      this,
      methodName
    ).encode(args);

    // Assert that the argsHash that has been signed matches the given arguments
    // We can use js-if here, because args are statically sized
    // i.e. the result of the if-statement will be the same for all executions
    // of this method
    const argsHash =
      (args ?? []).length > 0 ? Poseidon.hash(argsFields) : Field(0);

    transaction.argsHash.assertEquals(
      argsHash,
      "argsHash and therefore arguments of transaction and runtime call does not match"
    );

    const isMessage = Bool(options.invocationType === "INCOMING_MESSAGE");
    transaction.assertTransactionType(Bool(isMessage));

    const transactionHash = transaction.hash();
    const networkStateHash = networkState.hash();

    return new MethodPublicOutput({
      stateTransitionsHash,
      status,
      transactionHash,
      networkStateHash,
      isMessage,
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
export const runtimeMethodTypeMetadataKey = "proto-kit-runtime-method-type";

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

export type RuntimeMethodInvocationType = "SIGNATURE" | "INCOMING_MESSAGE";

function runtimeMethodInternal(options: {
  invocationType: RuntimeMethodInvocationType;
}) {
  return (
    target: RuntimeModule<unknown>,
    methodName: string,
    descriptor: TypedPropertyDescriptor<
      // TODO Limit possible parameter types
      (...args: any[]) => Promise<any>
    >
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

    Reflect.defineMetadata(
      runtimeMethodTypeMetadataKey,
      options.invocationType,
      target,
      methodName
    );

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const simulatedMethod = descriptor.value as DecoratedMethod;

    descriptor.value = async function value(
      this: RuntimeModule<unknown>,
      ...args: ArgumentTypes
    ) {
      const constructorName = this.name!;

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
        options,
      ]);

      /**
       * Before the prover runs, make sure it is operating on the correct
       * RuntimeMethodExecutionContext state, meaning it enters and exits
       * the context properly.
       */

      async function prover(this: ZkProgrammable<any, any>) {
        executionContext.beforeMethod(constructorName, methodName, args);
        const innerProver = toProver(
          combineMethodName(constructorName, methodName),
          simulatedWrappedMethod,
          false,
          ...args
        ).bind(this);
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

export function runtimeMessage() {
  return runtimeMethodInternal({
    invocationType: "INCOMING_MESSAGE",
  });
}

export function runtimeMethod() {
  return runtimeMethodInternal({
    invocationType: "SIGNATURE",
  });
}
