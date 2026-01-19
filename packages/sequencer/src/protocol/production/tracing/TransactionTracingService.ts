import {
  addTransactionToBundle,
  BlockProverMultiTransactionExecutionData,
  BlockProverPublicInput,
  BlockProverSingleTransactionExecutionData,
  ProvableNetworkState,
  TransactionProverTransactionArguments,
} from "@proto-kit/protocol";
import { Bool, Field, Signature } from "o1js";
import { MAX_FIELD } from "@proto-kit/common";
import { toStateTransitionsHash } from "@proto-kit/module";
import { injectable } from "tsyringe";

import { TransactionExecutionResult } from "../../../storage/model/Block";
import { PendingTransaction } from "../../../mempool/PendingTransaction";
import type { RuntimeProofParameters } from "../tasks/RuntimeProvingTask";
import {
  TransactionProverTaskParameters,
  TransactionProvingType,
} from "../tasks/serializers/types/TransactionProvingTypes";
import { UntypedStateTransition } from "../helpers/UntypedStateTransition";
import { VerificationKeyService } from "../../runtime/RuntimeVerificationKeyService";
import { JSONEncodableState } from "../tasks/serializers/DecodedStateSerializer";

import type { BlockTracingState } from "./BlockTracingService";

export type TransactionTrace =
  | {
      type: TransactionProvingType.SINGLE;
      transaction: TransactionProverTaskParameters<BlockProverSingleTransactionExecutionData>;
      runtime: [RuntimeProofParameters];
    }
  | {
      type: TransactionProvingType.MULTI;
      transaction: TransactionProverTaskParameters<BlockProverMultiTransactionExecutionData>;
      runtime: [RuntimeProofParameters, RuntimeProofParameters];
    };

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
    .filter((st) => st.from.isSome)
    .map((st) => [st.path, st.from.value]);

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
    previousState: BlockTracingState
  ): BlockProverPublicInput {
    return {
      stateRoot: previousState.stateRoot,
      transactionsHash: previousState.transactionList.commitment,
      eternalTransactionsHash: previousState.eternalTransactionsList.commitment,
      incomingMessagesHash: previousState.incomingMessages.commitment,
      networkStateHash: previousState.networkState.hash(),
      witnessedRootsHash: previousState.witnessedRoots.commitment,
      pendingSTBatchesHash: previousState.pendingSTBatches.commitment,
      blockHashRoot: Field(0),
      blockNumber: MAX_FIELD,
    };
  }

  private appendTransactionToState(
    previousState: BlockTracingState,
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
    networkState: ProvableNetworkState
  ): RuntimeProofParameters {
    const stBatch = tx.stateTransitions[1];
    const startingState = collectStartingState(stBatch.stateTransitions);

    return {
      tx: tx.tx,
      networkState: ProvableNetworkState.toJSON(networkState),
      state: startingState,
    };
  }

  private async traceTransaction(
    previousState: BlockTracingState,
    transaction: TransactionExecutionResult
  ) {
    const stBatches = transaction.stateTransitions;

    const beforeHookStartingState = collectStartingState(
      stBatches[0].stateTransitions.flat()
    );

    const runtimeTrace1 = this.createRuntimeProofParams(
      transaction,
      previousState.networkState
    );

    const afterHookStartingState = collectStartingState(
      stBatches[2].stateTransitions.flat()
    );

    const newState = this.appendTransactionToState(previousState, transaction);

    return {
      state: newState,
      runtime: runtimeTrace1,
      startingState: [beforeHookStartingState, afterHookStartingState],
    };
  }

  public async createSingleTransactionTrace(
    previousState: BlockTracingState,
    transaction: TransactionExecutionResult
  ): Promise<[BlockTracingState, TransactionTrace]> {
    const publicInput = this.getTransactionProofPublicInput(previousState);

    const {
      state: newState,
      startingState,
      runtime,
    } = await this.traceTransaction(previousState, transaction);

    const transactionTrace: TransactionProverTaskParameters<BlockProverSingleTransactionExecutionData> =
      {
        executionData: {
          transaction: await this.getTransactionData(transaction.tx),
          networkState: previousState.networkState,
        },
        startingState,
        publicInput,
      };

    return [
      newState,
      {
        type: TransactionProvingType.SINGLE,
        transaction: transactionTrace,
        runtime: [runtime],
      },
    ];
  }

  public async createMultiTransactionTrace(
    previousState: BlockTracingState,
    transaction1: TransactionExecutionResult,
    transaction2: TransactionExecutionResult
  ): Promise<[BlockTracingState, TransactionTrace]> {
    const publicInput = this.getTransactionProofPublicInput(previousState);

    const {
      state: tmpState,
      startingState: startingState1,
      runtime: runtime1,
    } = await this.traceTransaction(previousState, transaction1);

    const {
      state: resultState,
      startingState: startingState2,
      runtime: runtime2,
    } = await this.traceTransaction(tmpState, transaction2);

    const transactionTrace: TransactionProverTaskParameters<BlockProverMultiTransactionExecutionData> =
      {
        executionData: {
          transaction1: await this.getTransactionData(transaction1.tx),
          transaction2: await this.getTransactionData(transaction2.tx),
          networkState: previousState.networkState,
        },
        startingState: [...startingState1, ...startingState2],
        publicInput,
      };

    return [
      resultState,
      {
        type: TransactionProvingType.MULTI,
        transaction: transactionTrace,
        runtime: [runtime1, runtime2],
      },
    ];
  }
}
