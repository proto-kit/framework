import { Bool } from "snarkyjs";
import { singleton } from "tsyringe";
import {
  StateTransition,
  NetworkState,
  TransitionMethodExecutionContext,
  TransitionMethodExecutionResult,
  RuntimeTransaction,
} from "@proto-kit/protocol";

const errors = {
  setupNotCalled: () =>
    new Error(
      "Setup has not been called prior to executing a runtime method. Be sure to do that so that the Runtime is setup property for execution"
    ),
};

export class RuntimeProvableMethodExecutionResult extends TransitionMethodExecutionResult {
  public status: Bool = Bool(true);

  public statusMessage?: string;
}

export interface RuntimeMethodExecutionData {
  transaction: RuntimeTransaction;
  networkState: NetworkState;
}

/**
 * Execution context used to wrap runtime module methods,
 * allowing them to post relevant information (such as execution status)
 * into the context without any unnecessary 'prop drilling'.
 */
@singleton()
export class RuntimeMethodExecutionContext extends TransitionMethodExecutionContext {
  public methods: string[] = [];

  public input: RuntimeMethodExecutionData | undefined;

  // The input corresponding to the current result
  private lastInput: RuntimeMethodExecutionData | undefined;

  public override result = new RuntimeProvableMethodExecutionResult();

  private assertSetupCalled(): asserts this is {
    input: RuntimeMethodExecutionData;
  } {
    if (this.input === undefined) {
      throw errors.setupNotCalled();
    }
  }

  /**
   * Adds an in-method generated state transition to the current context
   * @param stateTransition - State transition to add to the context
   */
  public addStateTransition<Value>(stateTransition: StateTransition<Value>) {
    this.assertSetupCalled();
    super.addStateTransition(stateTransition);
  }

  /**
   * @param message - Status message to acompany the current status
   */
  public setStatusMessage(message?: string) {
    this.assertSetupCalled();
    this.result.statusMessage ??= message;
  }

  /**
   * @param status - Execution status of the current method
   */
  public setStatus(status: Bool) {
    this.assertSetupCalled();
    this.result.status = status;
  }

  /**
   * @param input Input witness data required for a runtime execution
   */
  public setup(input: RuntimeMethodExecutionData) {
    this.input = input;
  }

  /**
   * Manually clears/resets the execution context
   */
  public clear() {
    this.result = new RuntimeProvableMethodExecutionResult();
  }

  public afterMethod() {
    super.afterMethod();
    this.lastInput = this.input;
    this.input = undefined;
  }

  /**
   * Had to override current() otherwise it would not infer
   * the type of result correctly (parent type would be reused)
   */
  public current() {
    return {
      isFinished: this.isFinished,
      result: this.result,
      input: this.lastInput,
    };
  }
}
