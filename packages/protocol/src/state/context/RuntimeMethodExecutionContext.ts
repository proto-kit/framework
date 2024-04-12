import { Bool, Provable, Struct } from "o1js";
import { singleton } from "tsyringe";
import {
  ProvableMethodExecutionContext,
  ProvableMethodExecutionResult,
} from "@proto-kit/common";

import { StateTransition } from "../../model/StateTransition";
import { RuntimeTransaction } from "../../model/transaction/RuntimeTransaction";
import { NetworkState } from "../../model/network/NetworkState";

const errors = {
  setupNotCalled: () =>
    new Error(
      "Setup has not been called prior to executing a runtime method. Be sure to do that so that the Runtime is setup property for execution"
    ),
};

export class RuntimeProvableMethodExecutionResult extends ProvableMethodExecutionResult {
  public stateTransitions: StateTransition<any>[] = [];

  public status: Bool = Bool(true);

  public statusMessage?: string;
}

export interface RuntimeMethodExecutionData {
  transaction: RuntimeTransaction;
  networkState: NetworkState;
}

export class RuntimeMethodExecutionDataStruct
  extends Struct({
    transaction: RuntimeTransaction,
    networkState: NetworkState,
  })
  implements RuntimeMethodExecutionData {}

/**
 * Execution context used to wrap runtime module methods,
 * allowing them to post relevant information (such as execution status)
 * into the context without any unnecessary 'prop drilling'.
 */
@singleton()
export class RuntimeMethodExecutionContext extends ProvableMethodExecutionContext {
  public methods: string[] = [];

  public input: RuntimeMethodExecutionData | undefined;

  // The input corresponding to the current result
  private lastInput: RuntimeMethodExecutionData | undefined;

  public override result = new RuntimeProvableMethodExecutionResult();

  private isSimulated: boolean = false;

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
    this.result.stateTransitions.push(stateTransition);
  }

  /**
   * @param message - Status message to acompany the current status
   */
  public setStatusMessage(message?: string) {
    this.assertSetupCalled();
    if (this.isSimulated) {
      return;
    }
    this.result.statusMessage ??= message;
  }

  /**
   * @param status - Execution status of the current method
   */
  public setStatus(status: Bool) {
    this.assertSetupCalled();
    if (this.isSimulated) {
      return;
    }
    this.result.status = status;
  }

  /**
   * @param input Input witness data required for a runtime execution
   */
  public setup(input: RuntimeMethodExecutionData) {
    this.input = input;
  }

  public witnessInput(): RuntimeMethodExecutionDataStruct {
    this.assertSetupCalled();
    return Provable.witness(RuntimeMethodExecutionDataStruct, () => {
      // TODO Is that right? Or this.current().input
      const { transaction, networkState } = this.input!;
      return new RuntimeMethodExecutionDataStruct({
        networkState,
        transaction,
      });
    });
  }

  public setSimulated(simulated: boolean) {
    this.isSimulated = simulated;
  }

  /**
   * Manually clears/resets the execution context
   */
  public clear() {
    this.result = new RuntimeProvableMethodExecutionResult();
  }

  public afterMethod() {
    super.afterMethod();
    if (this.isFinished) {
      this.lastInput = this.input;
      // TODO: find out why input isnt set in TransactionFeeHook during assert
      // this.input = undefined;
      this.isSimulated = false;
    }
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
      isSimulated: this.isSimulated,
    };
  }
}
