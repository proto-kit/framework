import { Bool } from "o1js";
import { container } from "tsyringe";

import {
  ProvableStateTransition,
  StateTransition,
} from "../model/StateTransition";
import { AppliedStateTransitionBatch } from "../model/AppliedStateTransitionBatch";
import {
  RuntimeMethodExecutionContext,
  RuntimeMethodExecutionData,
} from "../state/context/RuntimeMethodExecutionContext";
import { RuntimeTransaction } from "../model/transaction/RuntimeTransaction";
import { MinaActions } from "../utils/MinaPrefixedProvableHashList";

import { StateTransitionReductionList } from "./accumulators/StateTransitionReductionList";
import { TransactionProverState } from "./transaction/TransactionProvable";

/**
 * Constructs a AppliedBatch based on a list of STs and the flag whether to
 * be applied or not. The AppliedBatch is a condensed commitment to a batch
 * of STs.
 */
export function constructBatch(
  stateTransitions: StateTransition<any>[],
  applied: Bool
) {
  const transitions = stateTransitions.map((transition) =>
    transition.toProvable()
  );

  const hashList = new StateTransitionReductionList(ProvableStateTransition);
  transitions.forEach((transition) => {
    hashList.push(transition);
  });

  return new AppliedStateTransitionBatch({
    batchHash: hashList.commitment,
    applied,
  });
}

// TODO How does this interact with the RuntimeMethodExecutionContext when executing runtimemethods?
export async function executeHooks<T>(
  contextArguments: RuntimeMethodExecutionData,
  hookName: string,
  method: () => Promise<T>,
  // This can be either that the tx is a message, or we are inside a dummy block hook
  skipEnforceStatus: Bool | undefined = undefined
) {
  const executionContext = container.resolve(RuntimeMethodExecutionContext);
  executionContext.clear();

  // Setup context for potential calls to runtime methods.
  // This way they can use this.transaction etc. while still having provable
  // integrity between data
  executionContext.setup(contextArguments);
  executionContext.beforeMethod("", "", []);

  const result = await method();

  executionContext.afterMethod();

  const { stateTransitions, status, statusMessage } =
    executionContext.current().result;

  // See https://github.com/proto-kit/framework/issues/321 for why we do this here
  if (skipEnforceStatus !== undefined) {
    // isMessage is defined for all tx hooks
    status
      .or(skipEnforceStatus)
      .assertTrue(
        `${hookName} hook call failed for non-message tx: ${statusMessage ?? "-"}`
      );
  } else {
    // isMessage is undefined for all block hooks
    status.assertTrue(`${hookName} hook call failed: ${statusMessage ?? "-"}`);
  }

  return {
    batch: constructBatch(stateTransitions, Bool(true)),
    result,
    rawStatus: status,
  };
}

export function addTransactionToBundle<
  T extends Pick<
    TransactionProverState,
    "transactionList" | "eternalTransactionsList" | "incomingMessages"
  >,
>(state: T, isMessage: Bool, transaction: RuntimeTransaction): T {
  const transactionHash = transaction.hash();

  // Append tx to transaction list
  state.transactionList.pushIf(transactionHash, isMessage.not());

  // Append tx to eternal transaction list
  // TODO Change that to the a sequence-state compatible transaction struct
  state.eternalTransactionsList.push(transactionHash);

  // Append tx to incomingMessagesHash
  const actionHash = MinaActions.actionHash(transaction.hashData());

  state.incomingMessages.pushIf(actionHash, isMessage);

  return state;
}
