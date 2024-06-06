import { StateTransition } from "../../model/StateTransition";

export class TransitionMethodExecutionResult {
  public stateTransitions: StateTransition<any>[] = [];
}

export interface TransitionMethodExecutionContext {
  /**
   * Adds an in-method generated state transition to the current context
   * @param stateTransition - State transition to add to the context
   */
  addStateTransition: <Value>(stateTransition: StateTransition<Value>) => void;

  /**
   * Manually clears/resets the execution context
   */
  clear: () => void;

  /**
   * Had to override current() otherwise it would not infer
   * the type of result correctly (parent type would be reused)
   */
  current: () => {
    result: TransitionMethodExecutionResult;
  };
}
