import type { Proof } from "o1js";
import { singleton } from "tsyringe";
import uniqueId from "lodash/uniqueId";

import type { ArgumentTypes } from "./provableMethod";

const errors = {
  moduleOrMethodNameNotSet: () => new Error("Module or method name not set"),

  proverNotSet: (moduleName: string, methodName: string) =>
    new Error(
      `Prover not set for '${moduleName}.${methodName}', did you forget to decorate your method?`
    ),
};

export class ProvableMethodExecutionResult {
  public moduleName?: string;

  public methodName?: string;

  public args?: ArgumentTypes;

  public prover?: () => Promise<Proof<unknown, unknown>>;

  public async prove<
    ProofType extends Proof<unknown, unknown>,
  >(): Promise<ProofType> {
    if (!this.prover) {
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!this.moduleName || !this.methodName) {
        throw errors.moduleOrMethodNameNotSet();
      }
      throw errors.proverNotSet(this.moduleName, this.methodName);
    }

    // turn the prover result into the desired proof type
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return (await this.prover()) as ProofType;
  }
}

/**
 * Execution context used to wrap runtime module methods,
 * allowing them to post relevant information (such as execution status)
 * into the context without any unnecessary 'prop drilling'.
 */
@singleton()
export class ProvableMethodExecutionContext {
  public id = uniqueId();

  public methods: string[] = [];

  public result: ProvableMethodExecutionResult =
    new ProvableMethodExecutionResult();

  // TODO See if we should make this class generic, bc I think we can persist the type
  /**
   * Adds a method prover to the current execution context,
   * which can be collected and ran asynchronously at a later point in time.
   *
   * @param prove - Prover function to be ran later,
   * when the method execution needs to be proven
   */
  public setProver(prover: () => Promise<Proof<unknown, unknown>>) {
    this.result.prover = prover;
  }

  /**
   * Adds a method to the method execution stack, reseting the execution context
   * in a case a new top-level (non nested) method call is made.
   *
   * @param methodName - Name of the method being captured in the context
   */
  public beforeMethod(
    moduleName: string,
    methodName: string,
    args: ArgumentTypes
  ) {
    if (this.isFinished) {
      this.clear();
      this.result.moduleName = moduleName;
      this.result.methodName = methodName;
      this.result.args = args;
    }

    this.methods.push(methodName);
  }

  /**
   * Removes the latest method from the execution context stack,
   * keeping track of the amount of 'unfinished' methods. Allowing
   * for the context to distinguish between top-level and nested method calls.
   */
  public afterMethod() {
    this.methods.pop();
  }

  public get isTopLevel() {
    return this.methods.length === 1;
  }

  public get isFinished() {
    return this.methods.length === 0;
  }

  /**
   * @returns - Current execution context state
   */
  public current() {
    return {
      isFinished: this.isFinished,
      result: this.result,
    };
  }

  /**
   * Manually clears/resets the execution context
   */
  public clear() {
    this.result = new ProvableMethodExecutionResult();
  }
}
