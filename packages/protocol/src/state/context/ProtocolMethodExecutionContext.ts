import { StateTransition } from "../../model/StateTransition";

import {
  TransitionMethodExecutionContext,
  TransitionMethodExecutionResult,
} from "./TransitionMethodExecutionContext";

export class ProtocolMethodExecutionContext
  implements TransitionMethodExecutionContext
{
  public result = new TransitionMethodExecutionResult();

  /**
   * Adds an in-method generated state transition to the current context
   * @param stateTransition - State transition to add to the context
   */
  public addStateTransition<Value>(stateTransition: StateTransition<Value>) {
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
      result: this.result,
    };
  }
}
