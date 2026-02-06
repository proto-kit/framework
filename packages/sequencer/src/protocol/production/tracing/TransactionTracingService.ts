import {
  addTransactionToBundle,
  NetworkState,
  TransactionProverArguments,
  TransactionProverPublicInput,
  TransactionProverState,
  TransactionProverTransactionArguments,
} from "@proto-kit/protocol";
import { Bool } from "o1js";
import { toStateTransitionsHash } from "@proto-kit/module";
import { injectable } from "tsyringe";

import { TransactionExecutionResult } from "../../../storage/model/Block";
import { PendingTransaction } from "../../../mempool/PendingTransaction";
import type { RuntimeProofParameters } from "../tasks/RuntimeProvingTask";
import { TransactionProverTaskParameters } from "../tasks/serializers/types/TransactionProvingTypes";
import { UntypedStateTransition } from "../helpers/UntypedStateTransition";
import { VerificationKeyService } from "../../runtime/RuntimeVerificationKeyService";

import type { TaskStateRecord } from "./BlockTracingService";

export type TransactionTrace = {
  transaction: TransactionProverTaskParameters;
  runtime: RuntimeProofParameters;
};

export type TransactionTracingState = TransactionProverState;

export function collectStartingState(
  stateTransitions: UntypedStateTransition[]
): TaskStateRecord {
  const stateEntries = stateTransitions
    // Filter distinct
    .filter(
      (st, index, array) =>
        array.findIndex((st2) => st2.path.toBigInt() === st.path.toBigInt()) ===
        index
    )
    // Filter out STs that have isSome: false as precondition, because this means
    // "state hasn't been set before" and has to correlate to a precondition on Field(0)
    // and for that the state has to be undefined
    .filter((st) => st.fromValue.isSome.toBoolean())
    .map((st) => [st.path.toString(), st.fromValue.value]);

  return Object.fromEntries(stateEntries);
}

@injectable()
export class TransactionTracingService {
  public constructor(
    private readonly verificationKeyService: VerificationKeyService
  ) {}

  public async getTransactionData(
    transaction: PendingTransaction
  ): Promise<TransactionProverTransactionArguments> {
    console.log(`[TransactionTracing] Getting transaction data for methodId: ${transaction.methodId.toBigInt()}`);
    console.log(`[TransactionTracing] Transaction nonce: ${transaction.nonce.toString()}, isMessage: ${transaction.isMessage}`);
    const verificationKeyAttestation =
      this.verificationKeyService.getAttestation(
        transaction.methodId.toBigInt()
      );

    return {
      transaction: transaction.toRuntimeTransaction(),
      signature: transaction.signature,
      verificationKeyAttestation,
    };
  }

  private getTransactionProofPublicInput(
    previousState: TransactionTracingState
  ): TransactionProverPublicInput {
    return {
      bundlesHash: previousState.bundleList.commitment,
      eternalTransactionsHash: previousState.eternalTransactionsList.commitment,
      incomingMessagesHash: previousState.incomingMessages.commitment,
    };
  }

  private appendTransactionToState(
    previousState: TransactionTracingState,
    transaction: TransactionExecutionResult
  ) {
    // TODO Remove this call and instead reuse results from sequencing
    const newState = addTransactionToBundle(
      previousState,
      Bool(transaction.tx.isMessage),
      transaction.tx.toRuntimeTransaction()
    );

    transaction.stateTransitions.forEach((batch) => {
      newState.pendingSTBatches.push({
        applied: Bool(batch.applied),
        batchHash: toStateTransitionsHash(batch.stateTransitions),
      });
    });

    return newState;
  }

  private createRuntimeProofParams(
    tx: TransactionExecutionResult,
    networkState: NetworkState
  ): RuntimeProofParameters {
    const startingState = collectStartingState(
      tx.stateTransitions[1].stateTransitions
    );

    return {
      tx: tx.tx,
      networkState,
      state: startingState,
    };
  }

  private async traceTransaction(
    previousState: TransactionTracingState,
    networkState: NetworkState,
    transaction: TransactionExecutionResult
  ) {
    const beforeHookStartingState = collectStartingState(
      transaction.stateTransitions[0].stateTransitions.flat()
    );

    const runtimeTrace1 = this.createRuntimeProofParams(
      transaction,
      networkState
    );

    const afterHookStartingState = collectStartingState(
      transaction.stateTransitions[2].stateTransitions.flat()
    );

    const args: TransactionProverArguments = {
      networkState: networkState,
      transactionHash: previousState.transactionList.commitment,
      pendingSTBatchesHash: previousState.pendingSTBatches.commitment,
      witnessedRootsHash: previousState.witnessedRoots.commitment,
      bundleListPreimage: previousState.bundleList.preimage!,
    };

    const newState = this.appendTransactionToState(previousState, transaction);

    newState.bundleList.addToBundle(newState, networkState);

    return {
      state: newState,
      runtime: runtimeTrace1,
      startingState: [beforeHookStartingState, afterHookStartingState],
      args,
    };
  }

  public async createTransactionTrace(
    previousState: TransactionTracingState,
    networkState: NetworkState,
    transaction: TransactionExecutionResult
  ): Promise<[TransactionTracingState, TransactionTrace]> {
    const publicInput = this.getTransactionProofPublicInput(previousState);

    const {
      state: newState,
      startingState,
      runtime,
      args,
    } = await this.traceTransaction(previousState, networkState, transaction);

    const transactionTrace: TransactionProverTaskParameters = {
      executionData: {
        transaction: await this.getTransactionData(transaction.tx),
        args,
      },
      startingState,
      publicInput,
    };

    return [
      newState,
      {
        transaction: transactionTrace,
        runtime,
      },
    ];
  }
}
