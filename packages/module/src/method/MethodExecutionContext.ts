/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable max-classes-per-file */
/* eslint-disable import/no-unused-modules */
/* eslint-disable new-cap */
import { Bool, type Proof } from 'snarkyjs';
import { singleton } from 'tsyringe';

import type { StateTransition } from '../stateTransition/StateTransition.js';

import type { MethodPublicInput } from './decorator.js';

export class MethodExecutionResult<ResultValue> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public stateTransitions: StateTransition<any>[] = [];

  public status: Bool = Bool(true);

  public statusMessage?: string;

  public value?: ResultValue;

  public prove?: () => Promise<Proof<MethodPublicInput>>;
}

/**
 * Execution context used to wrap runtime module methods,
 * allowing them to post relevant information (such as execution status)
 * into the context without any unnecessary 'prop drilling'.
 */
@singleton()
export class MethodExecutionContext<ResultValue> {
  public methods: string[] = [];

  public constructor(
    public result: MethodExecutionResult<ResultValue> = new MethodExecutionResult()
  ) {}

  /**
   * Adds an in-method generated state transition to the current context
   * @param stateTransition - State transition to add to the context
   */
  public addStateTransition<Value>(stateTransition: StateTransition<Value>) {
    this.result.stateTransitions.push(stateTransition);
  }

  /**
   * @param message - Status message to acompany the current status
   */
  public setStatusMessage(message?: string) {
    this.result.statusMessage ??= message;
  }

  /**
   * @param status - Execution status of the current method
   */
  public setStatus(status: Bool) {
    this.result.status = status;
  }

  /**
   * @param value = Return value of the executed method
   */
  public setValue(value: ResultValue) {
    this.result.value = value;
  }

  /**
   * Adds a method prover to the current execution context,
   * which can be collected and ran asynchronously at a later point in time.
   *
   * @param prove - Prover function to be ran later,
   * when the method execution needs to be proven
   */
  public setProve(prove: () => Promise<Proof<MethodPublicInput>>) {
    this.result.prove = prove;
  }

  /**
   * Adds a method to the method execution stack, reseting the execution context
   * in a case a new top-level (non nested) method call is made.
   *
   * @param methodName - Name of the method being captured in the context
   */
  public beforeMethod(methodName: string) {
    if (this.isFinished) {
      this.result = new MethodExecutionResult();
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
    return this.isFinished;
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
    this.result = new MethodExecutionResult();
  }
}
