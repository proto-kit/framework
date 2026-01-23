import {
  addTransactionToBundle,
  NetworkState,
  ProvableNetworkState,
  TransactionProverArguments,
  TransactionProverPublicInput,
  TransactionProverState,
  TransactionProverTransactionArguments,
} from "@proto-kit/protocol";
import { Bool, Signature } from "o1js";
import { toStateTransitionsHash } from "@proto-kit/module";
import { injectable } from "tsyringe";

import { TransactionExecutionResult } from "../../../storage/model/Block";
import { PendingTransaction } from "../../../mempool/PendingTransaction";
import type { RuntimeProofParameters } from "../tasks/RuntimeProvingTask";
import { TransactionProverTaskParameters } from "../tasks/serializers/types/TransactionProvingTypes";
import { UntypedStateTransition } from "../helpers/UntypedStateTransition";
import { VerificationKeyService } from "../../runtime/RuntimeVerificationKeyService";
import { JSONEncodableState } from "../tasks/serializers/DecodedStateSerializer";

export type TransactionTrace = {
  transaction: TransactionProverTaskParameters;
  runtime: RuntimeProofParameters;
};

export type TransactionTracingState = TransactionProverState;

export function collectStartingState(
  stateTransitions: UntypedStateTransition[]
): JSONEncodableState {
  const stateEntries = stateTransitions
    // Filter distinct
    .filter(
      (st, index, array) =>
        array.findIndex((st2) => st2.path === st.path) === index
    )
    // Filter out STs that have isSome: false as precondition, because this means
    // "state hasn't been set before" and has to correlate to a precondition on Field(0)
    // and for that the state has to be undefined
    .filter((st) => st.fromValue.isSome)
    .map((st) => [st.path, st.fromValue.value]);

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
    const verificationKeyAttestation =
      this.verificationKeyService.getAttestation(transaction.methodId);

    return {
      transaction: transaction.toRuntimeTransaction(),
      signature: Signature.fromJSON(transaction.signature),
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
    const { tx } = transaction;
    // TODO Remove this call and instead reuse results from sequencing
    const newState = addTransactionToBundle(
      previousState,
      Bool(tx.isMessage),
      tx.toRuntimeTransaction()
    );

    const stBatches = transaction.stateTransitions;
    stBatches.forEach((batch) => {
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
    const stBatch = tx.stateTransitions[1];
    const startingState = collectStartingState(stBatch.stateTransitions);

    return {
      tx: tx.tx,
      networkState: networkState,
      state: startingState,
    };
  }

  private async traceTransaction(
    previousState: TransactionTracingState,
    networkState: NetworkState,
    transaction: TransactionExecutionResult
  ) {
    const stBatches = transaction.stateTransitions;
    const provableNetworkState = new ProvableNetworkState(
      ProvableNetworkState.fromJSON(networkState)
    );

    const beforeHookStartingState = collectStartingState(
      stBatches[0].stateTransitions.flat()
    );

    const runtimeTrace1 = this.createRuntimeProofParams(
      transaction,
      networkState
    );

    const afterHookStartingState = collectStartingState(
      stBatches[2].stateTransitions.flat()
    );

    const args: TransactionProverArguments = {
      networkState: provableNetworkState,
      transactionHash: previousState.transactionList.commitment,
      pendingSTBatchesHash: previousState.pendingSTBatches.commitment,
      witnessedRootsHash: previousState.witnessedRoots.commitment,
      bundleListPreimage: previousState.bundleList.preimage!,
    };

    const newState = this.appendTransactionToState(previousState, transaction);

    newState.bundleList.addToBundle(newState, provableNetworkState);

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
