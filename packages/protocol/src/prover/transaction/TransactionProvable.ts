// eslint-disable-next-line max-classes-per-file
import { CompilableModule, WithZkProgrammable } from "@proto-kit/common";
import { DynamicProof, Field, Proof, Signature, Struct, Void } from "o1js";

import { RuntimeTransaction } from "../../model/transaction/RuntimeTransaction";
import { RuntimeVerificationKeyAttestation } from "../block/accummulators/RuntimeVerificationKeyTree";
import { MethodPublicOutput } from "../../model/MethodPublicOutput";
import { NetworkState } from "../../model/network/NetworkState";
import { TransactionHashList } from "../accumulators/TransactionHashList";
import { AppliedBatchHashList } from "../accumulators/AppliedBatchHashList";
import { MinaActionsHashList } from "../../utils/MinaPrefixedProvableHashList";
import { WitnessedRootHashList } from "../accumulators/WitnessedRootHashList";
import { BundleHashList, BundlePreimage } from "../accumulators/BlockHashList";

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
  bundleList: BundleHashList;

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
    bundleList: BundleHashList;
    eternalTransactionsList: TransactionHashList;
    pendingSTBatches: AppliedBatchHashList;
    incomingMessages: MinaActionsHashList;
    witnessedRoots: WitnessedRootHashList;
  }) {
    this.transactionList = args.transactionList;
    this.bundleList = args.bundleList;
    this.eternalTransactionsList = args.eternalTransactionsList;
    this.pendingSTBatches = args.pendingSTBatches;
    this.incomingMessages = args.incomingMessages;
    this.witnessedRoots = args.witnessedRoots;
  }

  public toCommitments(): TransactionProverPublicInput {
    return {
      bundlesHash: this.bundleList.commitment,
      // pendingSTBatchesHash: this.pendingSTBatches.commitment,
      // transactionsHash: this.transactionList.commitment,
      eternalTransactionsHash: this.eternalTransactionsList.commitment,
      incomingMessagesHash: this.incomingMessages.commitment,
      // witnessedRootsHash: this.witnessedRoots.commitment,
    };
  }

  public static fromCommitments(
    publicInput: TransactionProverPublicInput,
    args: TransactionProverArguments
  ): TransactionProverState {
    return new TransactionProverState({
      // Stuff that has to be authenticated via public input, since it's not inside the bundle hash
      bundleList: new BundleHashList(
        publicInput.bundlesHash,
        args.bundleListPreimage
      ),
      eternalTransactionsList: new TransactionHashList(
        publicInput.eternalTransactionsHash
      ),
      incomingMessages: new MinaActionsHashList(
        publicInput.incomingMessagesHash
      ),
      // Remainders (i.e. stuff that goes into the bundle)
      transactionList: new TransactionHashList(args.transactionHash),
      pendingSTBatches: new AppliedBatchHashList(args.pendingSTBatchesHash),
      witnessedRoots: new WitnessedRootHashList(args.witnessedRootsHash),
    });
  }
}

// These are all linear trackers, i.e. continuously progressing without
// interruptions from the block prover
export const TransactionProverStateCommitments = {
  bundlesHash: Field,
  eternalTransactionsHash: Field,
  incomingMessagesHash: Field,
};

export class TransactionProverArguments extends Struct({
  // Commitment to the list of unprocessed (pending) batches of STs that need to be proven
  pendingSTBatchesHash: Field,
  witnessedRootsHash: Field,
  transactionHash: Field,
  bundleListPreimage: BundlePreimage,
  networkState: NetworkState,
}) {}

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

export class TransactionProverExecutionData extends Struct({
  transaction: TransactionProverTransactionArguments,
  args: TransactionProverArguments,
}) {}

export type TransactionProof = Proof<
  TransactionProverPublicInput,
  TransactionProverPublicOutput
>;

export interface TransactionProvable
  extends
    WithZkProgrammable<
      TransactionProverPublicInput,
      TransactionProverPublicOutput
    >,
    CompilableModule {
  proveTransaction: (
    publicInput: TransactionProverPublicInput,
    runtimeProof: DynamicRuntimeProof,
    executionData: TransactionProverExecutionData
  ) => Promise<TransactionProverPublicOutput>;

  proveTransactions: (
    publicInput: TransactionProverPublicInput,
    runtimeProof1: DynamicRuntimeProof,
    runtimeProof2: DynamicRuntimeProof,
    executionData1: TransactionProverExecutionData,
    executionData2: TransactionProverExecutionData
  ) => Promise<TransactionProverPublicOutput>;

  dummy: (
    publicInput: TransactionProverPublicInput
  ) => Promise<TransactionProverPublicOutput>;

  merge: (
    publicInput: TransactionProverPublicInput,
    proof1: TransactionProof,
    proof2: TransactionProof
  ) => Promise<TransactionProverPublicOutput>;
}
