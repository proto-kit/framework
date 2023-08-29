import {
  ProvableMethodExecutionContext,
  ProvableMethodExecutionResult,
} from "@proto-kit/common";
import { StateTransition } from "../../model/StateTransition";

export class TransitionMethodExecutionResult extends ProvableMethodExecutionResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public stateTransitions: StateTransition<any>[] = [];
}

export abstract class TransitionMethodExecutionContext extends ProvableMethodExecutionContext {
  public result = new TransitionMethodExecutionResult();

  /**
   * Adds an in-method generated state transition to the current context
   * @param stateTransition - State transition to add to the context
   */
  public addStateTransition<Value>(
    stateTransition: StateTransition<Value>
  ) {
    this.result.stateTransitions.push(stateTransition);
  }

  /**
   * Manually clears/resets the execution context
   */
  public clear() {
    this.result = new TransitionMethodExecutionResult();
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