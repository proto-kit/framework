import { Proof, DynamicProof } from "o1js";
import { container } from "tsyringe";

import { ProvableMethodExecutionContext } from "./ProvableMethodExecutionContext";
import type { WithZkProgrammable, ZkProgrammable } from "./ZkProgrammable";

// Now, in o1js provable types are normal js objects, therefore any
export type O1JSPrimitive = object | string | boolean | number;
export type ArgumentTypes = (
  | O1JSPrimitive
  | Proof<unknown, unknown>
  | DynamicProof<unknown, unknown>
)[];

export type DecoratedMethod = (...args: ArgumentTypes) => Promise<unknown>;

export const MOCK_PROOF = "mock-proof";
// (await Proof.dummy(Field(0), Field(0), 2)).proof as string;

export function toProver(
  methodName: string,
  simulatedMethod: DecoratedMethod,
  isFirstParameterPublicInput: boolean,
  ...args: ArgumentTypes
) {
  return async function prover(this: ZkProgrammable<any, any>) {
    const { areProofsEnabled } = this.areProofsEnabled!;

    const zkProgram = this.zkProgram.find((prog) =>
      Object.keys(prog.methods).includes(methodName)
    );

    if (zkProgram === undefined) {
      throw new Error("Correct ZkProgram not found");
    }

    if (areProofsEnabled) {
      const programProvableMethod = zkProgram.methods[methodName];
      return await Reflect.apply(programProvableMethod, this, args);
    }

    // create a mock proof by simulating method> execution in JS
    const publicOutput = await Reflect.apply(simulatedMethod, this, args);

    return new zkProgram.Proof({
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
