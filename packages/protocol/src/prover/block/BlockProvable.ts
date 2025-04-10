// eslint-disable-next-line max-classes-per-file
import {
  Bool,
  DynamicProof,
  Field,
  Proof,
  Signature,
  Struct,
  Void,
} from "o1js";
import { WithZkProgrammable, CompilableModule } from "@proto-kit/common";

import { StateTransitionProof } from "../statetransition/StateTransitionProvable";
import { MethodPublicOutput } from "../../model/MethodPublicOutput";
import { RuntimeTransaction } from "../../model/transaction/RuntimeTransaction";
import { NetworkState } from "../../model/network/NetworkState";
import { TransactionHashList } from "../accumulators/TransactionHashList";
import { MinaActionsHashList } from "../../utils/MinaPrefixedProvableHashList";
import { AppliedBatchHashList } from "../accumulators/AppliedBatchHashList";
import {
  WitnessedRootHashList,
  WitnessedRootWitness,
} from "../accumulators/WitnessedRootHashList";

import { BlockHashMerkleTreeWitness } from "./accummulators/BlockHashMerkleTree";
import { RuntimeVerificationKeyAttestation } from "./accummulators/RuntimeVerificationKeyTree";

// Should be equal to BlockProver.PublicInput
export interface BlockProverState {
  /**
   * The current state root of the block prover
   */
  stateRoot: Field;

  /**
   * The current commitment of the transaction-list which
   * will at the end equal the bundle hash
   */
  transactionList: TransactionHashList;

  /**
   * The network state which gives access to values such as blockHeight
   * This value is the same for the whole batch (L2 block)
   */
  networkState: NetworkState;

  /**
   * The root of the merkle tree encoding all block hashes,
   * see `BlockHashMerkleTree`
   */
  blockHashRoot: Field;

  /**
   * A variant of the transactionsHash that is never reset.
   * Thought for usage in the sequence state mempool.
   * In comparison, transactionsHash restarts at 0 for every new block
   */
  eternalTransactionsList: TransactionHashList;

  pendingSTBatches: AppliedBatchHashList;

  incomingMessages: MinaActionsHashList;

  witnessedRoots: WitnessedRootHashList;

  blockNumber: Field;
}

// TODO Sort and organize public inputs and outputs
export class BlockProverStateCommitments extends Struct({
  transactionsHash: Field,
  stateRoot: Field,
  // Commitment to the list of unprocessed (pending) batches of STs that need to be proven
  pendingSTBatchesHash: Field,
  witnessedRootsHash: Field,
  networkStateHash: Field,
  blockHashRoot: Field,
  eternalTransactionsHash: Field,
  incomingMessagesHash: Field,
  blockNumber: Field,
}) {
  public static fromBlockProverState(
    state: BlockProverState
  ): BlockProverStateCommitments {
    return {
      networkStateHash: state.networkState.hash(),
      stateRoot: state.stateRoot,
      blockNumber: state.blockNumber,
      blockHashRoot: state.blockHashRoot,
      pendingSTBatchesHash: state.pendingSTBatches.commitment,
      transactionsHash: state.transactionList.commitment,
      eternalTransactionsHash: state.eternalTransactionsList.commitment,
      incomingMessagesHash: state.incomingMessages.commitment,
      witnessedRootsHash: state.witnessedRoots.commitment,
    };
  }

  public static toBlockProverState(
    publicInput: BlockProverStateCommitments,
    networkState: NetworkState
  ): BlockProverState {
    publicInput.networkStateHash.assertEquals(
      networkState.hash(),
      "ExecutionData Networkstate doesn't equal public input hash"
    );

    return {
      networkState,
      stateRoot: publicInput.stateRoot,
      blockHashRoot: publicInput.blockHashRoot,
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
      blockNumber: publicInput.blockNumber,
    };
  }
}

export class BlockProverPublicInput extends BlockProverStateCommitments {}

export class BlockProverPublicOutput extends Struct({
  transactionsHash: Field,
  stateRoot: Field,
  pendingSTBatchesHash: Field,
  witnessedRootsHash: Field,
  networkStateHash: Field,
  blockHashRoot: Field,
  eternalTransactionsHash: Field,
  incomingMessagesHash: Field,
  closed: Bool,
  blockNumber: Field,
}) {
  public equals(input: BlockProverPublicInput, closed: Bool): Bool {
    const output2 = BlockProverPublicOutput.toFields({
      ...input,
      closed,
    });
    const output1 = BlockProverPublicOutput.toFields(this);
    return output1
      .map((value1, index) => value1.equals(output2[index]))
      .reduce((a, b) => a.and(b));
  }
}

export type BlockProverProof = Proof<
  BlockProverPublicInput,
  BlockProverPublicOutput
>;

export class BlockProverTransactionArguments extends Struct({
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
  transaction: BlockProverTransactionArguments,
  networkState: NetworkState,
}) {}

export class BlockProverMultiTransactionExecutionData extends Struct({
  transaction1: BlockProverTransactionArguments,
  transaction2: BlockProverTransactionArguments,
  networkState: NetworkState,
}) {}

export interface BlockProvable
  extends WithZkProgrammable<BlockProverPublicInput, BlockProverPublicOutput>,
    CompilableModule {
  proveTransaction: (
    publicInput: BlockProverPublicInput,
    runtimeProof: DynamicRuntimeProof,
    executionData: BlockProverSingleTransactionExecutionData
  ) => Promise<BlockProverPublicOutput>;

  proveTransactions: (
    publicInput: BlockProverPublicInput,
    runtimeProof1: DynamicRuntimeProof,
    runtimeProof2: DynamicRuntimeProof,
    executionData: BlockProverMultiTransactionExecutionData
  ) => Promise<BlockProverPublicOutput>;

  proveBlock: (
    publicInput: BlockProverPublicInput,
    networkState: NetworkState,
    blockWitness: BlockHashMerkleTreeWitness,
    stateTransitionProof: StateTransitionProof,
    deferSTs: Bool,
    afterBlockRootWitness: WitnessedRootWitness,
    transactionProof: BlockProverProof
  ) => Promise<BlockProverPublicOutput>;

  merge: (
    publicInput: BlockProverPublicInput,
    proof1: BlockProverProof,
    proof2: BlockProverProof
  ) => Promise<BlockProverPublicOutput>;
}
