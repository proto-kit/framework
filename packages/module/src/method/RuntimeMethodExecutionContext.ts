import { Bool } from "snarkyjs";
import { singleton } from "tsyringe";
import type { StateTransition } from "@yab/protocol";
import {
  ProvableMethodExecutionContext,
  ProvableMethodExecutionResult,
} from "@yab/common";

export class RuntimeProvableMethodExecutionResult extends ProvableMethodExecutionResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public stateTransitions: StateTransition<any>[] = [];

  public status: Bool = Bool(true);

  public statusMessage?: string;
}

/**
 * Execution context used to wrap runtime module methods,
 * allowing them to post relevant information (such as execution status)
 * into the context without any unnecessary 'prop drilling'.
 */
@singleton()
export class RuntimeMethodExecutionContext extends ProvableMethodExecutionContext {
  public methods: string[] = [];

  public override result = new RuntimeProvableMethodExecutionResult();

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
   * Manually clears/resets the execution context
   */
  public clear() {
    this.result = new RuntimeProvableMethodExecutionResult();
  }

  /**
   * Had to override current() otherwise it would not infer
   * the type of result correctly (parent type would be reused)
   */
  public current() {
    return {
      isFinished: this.isFinished,
      result: this.result,
    };
  }
}
