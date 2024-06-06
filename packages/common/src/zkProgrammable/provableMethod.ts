import { Proof } from "o1js";
import { container } from "tsyringe";

import { ToFieldable } from "../utils";

import { ProvableMethodExecutionContext } from "./ProvableMethodExecutionContext";
import type { WithZkProgrammable, ZkProgrammable } from "./ZkProgrammable";

export type O1JSPrimitive = ToFieldable;
export type ArgumentTypes = (O1JSPrimitive | Proof<unknown, unknown>)[];

export type DecoratedMethod = (...args: ArgumentTypes) => Promise<unknown>;

export const MOCK_PROOF = "mock-proof";

export function toProver(
  methodName: string,
  simulatedMethod: DecoratedMethod,
  isFirstParameterPublicInput: boolean,
  ...args: ArgumentTypes
) {
  return async function prover(this: ZkProgrammable<any, any>) {
    const areProofsEnabled = this.appChain?.areProofsEnabled;
    if (areProofsEnabled ?? false) {
      const programProvableMethod = this.zkProgram.methods[methodName];
      return await Reflect.apply(programProvableMethod, this, args);
    }

    // create a mock proof by simulating method execution in JS
    const publicOutput = await Reflect.apply(simulatedMethod, this, args);

    return new this.zkProgram.Proof({
      proof: MOCK_PROOF,

      // TODO: provide undefined if public input is not used
      publicInput: isFirstParameterPublicInput ? args[0] : undefined,
      publicOutput,

      /**
       * We set this to the max possible number, to avoid having
       * to manually count in-circuit proof verifications
       */
      maxProofsVerified: 2,
    });
  };
}

/**
 * Decorates a provable method on a 'prover class', depending on
 * if proofs are enabled or not, either runs the respective zkProgram prover,
 * or simulates the method execution and issues a mock proof.
 *
 * @param isFirstParameterPublicInput
 * @param executionContext
 * @returns
 */
export function provableMethod(
  isFirstParameterPublicInput = true,
  executionContext: ProvableMethodExecutionContext = container.resolve<ProvableMethodExecutionContext>(
    ProvableMethodExecutionContext
  )
) {
  return <
    Target extends WithZkProgrammable<any, any> | ZkProgrammable<any, any>,
  >(
    target: Target,
    methodName: string,
    descriptor: TypedPropertyDescriptor<(...args: any[]) => Promise<any> | any>
  ) => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const simulatedMethod = descriptor.value as DecoratedMethod;

    descriptor.value = async function value(
      this: ZkProgrammable<unknown, unknown>,
      ...args: ArgumentTypes
    ) {
      const prover = toProver(
        methodName,
        simulatedMethod,
        isFirstParameterPublicInput,
        ...args
      );

      executionContext.beforeMethod(this.constructor.name, methodName, args);

      /**
       * Check if the method is called at the top level,
       * if yes then create a prover.
       */
      if (executionContext.isTopLevel) {
        executionContext.setProver(prover.bind(this));
      }

      /**
       * Regardless of if the method is called from the top level
       * or not, execute its simulated (Javascript) version and
       * return the result.
       */
      let result: unknown;
      try {
        result = Reflect.apply(simulatedMethod, this, args);
      } finally {
        executionContext.afterMethod();
      }

      return result;
    };

    return descriptor;
  };
}
