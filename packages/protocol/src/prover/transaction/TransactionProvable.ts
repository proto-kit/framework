// eslint-disable-next-line max-classes-per-file
import { CompilableModule, WithZkProgrammable } from "@proto-kit/common";
import { DynamicProof, Field, Proof, Signature, Struct, Void } from "o1js";

import { RuntimeTransaction } from "../../model/transaction/RuntimeTransaction";
import { RuntimeVerificationKeyAttestation } from "../block/accummulators/RuntimeVerificationKeyTree";
import { MethodPublicOutput } from "../../model/MethodPublicOutput";
import { ProvableNetworkState } from "../../model/network/NetworkState";
import { TransactionHashList } from "../accumulators/TransactionHashList";
import { AppliedBatchHashList } from "../accumulators/AppliedBatchHashList";
import { MinaActionsHashList } from "../../utils/MinaPrefixedProvableHashList";
import { WitnessedRootHashList } from "../accumulators/WitnessedRootHashList";

export class TransactionProverState {
  /**
   * The current commitment of the transaction-list which
   * will at the end equal the bundle hash
   */
  transactionList: TransactionHashList;

  /**
   * The network state which gives access to values such as blockHeight
   * This value is the same for the whole batch (L2 block)
   */
  networkState: ProvableNetworkState;

  /**
   * A variant of the transactionsHash that is never reset.
   * Thought for usage in the sequence state mempool.
   * In comparison, transactionsHash restarts at 0 for every new block
   */
  eternalTransactionsList: TransactionHashList;

  pendingSTBatches: AppliedBatchHashList;

  incomingMessages: MinaActionsHashList;

  witnessedRoots: WitnessedRootHashList;

  constructor(args: {
    transactionList: TransactionHashList;
    networkState: ProvableNetworkState;
    eternalTransactionsList: TransactionHashList;
    pendingSTBatches: AppliedBatchHashList;
    incomingMessages: MinaActionsHashList;
    witnessedRoots: WitnessedRootHashList;
  }) {
    this.transactionList = args.transactionList;
    this.networkState = args.networkState;
    this.eternalTransactionsList = args.eternalTransactionsList;
    this.pendingSTBatches = args.pendingSTBatches;
    this.incomingMessages = args.incomingMessages;
    this.witnessedRoots = args.witnessedRoots;
  }

  public toCommitments(): TransactionProverPublicInput {
    return {
      networkStateHash: this.networkState.hash(),
      pendingSTBatchesHash: this.pendingSTBatches.commitment,
      transactionsHash: this.transactionList.commitment,
      eternalTransactionsHash: this.eternalTransactionsList.commitment,
      incomingMessagesHash: this.incomingMessages.commitment,
      witnessedRootsHash: this.witnessedRoots.commitment,
    };
  }

  public static fromCommitments(
    publicInput: TransactionProverPublicInput,
    networkState: ProvableNetworkState
  ): TransactionProverState {
    publicInput.networkStateHash.assertEquals(
      networkState.hash(),
      "ExecutionData Networkstate doesn't equal public input hash"
    );

    return new TransactionProverState({
      networkState,
      transactionList: new TransactionHashList(publicInput.transactionsHash),
      eternalTransactionsList: new TransactionHashList(
        publicInput.eternalTransactionsHash
      ),
      incomingMessages: new MinaActionsHashList(
        publicInput.incomingMessagesHash
      ),
      pendingSTBatches: new AppliedBatchHashList(
        publicInput.pendingSTBatchesHash
      ),
      witnessedRoots: new WitnessedRootHashList(publicInput.witnessedRootsHash),
    });
  }
}

export const TransactionProverStateCommitments = {
  transactionsHash: Field,
  // Commitment to the list of unprocessed (pending) batches of STs that need to be proven
  pendingSTBatchesHash: Field,
  witnessedRootsHash: Field,
  networkStateHash: Field,
  eternalTransactionsHash: Field,
  incomingMessagesHash: Field,
};

export class TransactionProverPublicInput extends Struct(
  TransactionProverStateCommitments
) {
  public static equals(
    input1: TransactionProverPublicInput,
    input2: TransactionProverPublicInput
  ) {
    const output2 = TransactionProverPublicInput.toFields(input2);
    const output1 = TransactionProverPublicInput.toFields(input1);
    return output1
      .map((value1, index) => value1.equals(output2[index]))
      .reduce((a, b) => a.and(b));
  }
}

export class TransactionProverPublicOutput extends TransactionProverPublicInput {}

export class TransactionProverTransactionArguments extends Struct({
  transaction: RuntimeTransaction,
  signature: Signature,
  verificationKeyAttestation: RuntimeVerificationKeyAttestation,
}) {}

export class DynamicRuntimeProof extends DynamicProof<
  Void,
  MethodPublicOutput
> {
  static publicInputType = Void;

  static publicOutputType = MethodPublicOutput;

  // TODO this won't be 0 for proofs-as-args
  static maxProofsVerified = 0 as const;
}

export class BlockProverSingleTransactionExecutionData extends Struct({
  transaction: TransactionProverTransactionArguments,
  networkState: ProvableNetworkState,
}) {}

export class BlockProverMultiTransactionExecutionData extends Struct({
  transaction1: TransactionProverTransactionArguments,
  transaction2: TransactionProverTransactionArguments,
  networkState: ProvableNetworkState,
}) {}

export type TransactionProof = Proof<
  TransactionProverPublicInput,
  TransactionProverPublicOutput
>;

export interface TransactionProvable
  extends WithZkProgrammable<
      TransactionProverPublicInput,
      TransactionProverPublicOutput
    >,
    CompilableModule {
  proveTransaction: (
    publicInput: TransactionProverPublicInput,
    runtimeProof: DynamicRuntimeProof,
    executionData: BlockProverSingleTransactionExecutionData
  ) => Promise<TransactionProverPublicOutput>;

  proveTransactions: (
    publicInput: TransactionProverPublicInput,
    runtimeProof1: DynamicRuntimeProof,
    runtimeProof2: DynamicRuntimeProof,
    executionData: BlockProverMultiTransactionExecutionData
  ) => Promise<TransactionProverPublicOutput>;

  merge: (
    publicInput: TransactionProverPublicInput,
    proof1: TransactionProof,
    proof2: TransactionProof
  ) => Promise<TransactionProverPublicOutput>;
}
