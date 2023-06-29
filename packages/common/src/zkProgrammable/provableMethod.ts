/* eslint-disable import/no-unused-modules */
import { container } from "tsyringe";

import { ProvableMethodExecutionContext } from "./ProvableMethodExecutionContext";
// eslint-disable-next-line import/no-cycle
import { ZkProgrammable } from "./ZkProgrammable";

// eslint-disable-next-line etc/prefer-interface
export type DecoratedMethod = (...args: unknown[]) => unknown;

export const mockProof = "mock-proof";
export function provableMethod() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <Target extends ZkProgrammable<any, any>>(
    target: Target,
    methodName: string,
    descriptor: PropertyDescriptor
  ) => {
    const executionContext = container.resolve<ProvableMethodExecutionContext>(
      ProvableMethodExecutionContext
    );

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const originalFunction = descriptor.value as DecoratedMethod;

    descriptor.value = function value(
      this: ZkProgrammable<unknown, unknown>,
      ...args: unknown[]
    ) {
      async function prover(this: ZkProgrammable<unknown, unknown>) {
        const areProofsEnabled = this.appChain?.areProofsEnabled;
        if (areProofsEnabled ?? false) {
          const provableFunction = this.zkProgram.methods[methodName];
          return await Reflect.apply(provableFunction, this, args);
        }

        const publicOutput = Reflect.apply(originalFunction, this, args);

        return new this.zkProgram.Proof({
          proof: mockProof,
          publicInput: args[0],
          publicOutput,

          /**
           * We set this to the max possible number, to avoid having
           * to manually count in-circuit proof verifications
           */
          maxProofsVerified: 2,
        });
      }

      executionContext.beforeMethod(this.constructor.name, methodName);

      /**
       * Check if the method is called at the top level,
       * if yes then create a prover.
       *
       * If the method is called from another @provableMethod(),
       * then execute just its JS version.
       */
      if (executionContext.isTopLevel) {
        executionContext.setProver(prover.bind(this));
      }

      // eslint-disable-next-line @typescript-eslint/init-declarations
      let result: unknown;
      try {
        result = Reflect.apply(originalFunction, this, args);
      } finally {
        executionContext.afterMethod();
      }

      return result;
    };
  };
}
