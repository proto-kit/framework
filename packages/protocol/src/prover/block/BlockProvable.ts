import { Bool, Field, Proof, Provable, Struct } from "o1js";
import { CompilableModule, WithZkProgrammable } from "@proto-kit/common";

import { StateTransitionProof } from "../statetransition/StateTransitionProvable";
import { NetworkState } from "../../model/network/NetworkState";
import { TransactionHashList } from "../accumulators/TransactionHashList";
import { MinaActionsHashList } from "../../utils/MinaPrefixedProvableHashList";
import { AppliedBatchHashList } from "../accumulators/AppliedBatchHashList";
import {
  WitnessedRootHashList,
  WitnessedRootWitness,
} from "../accumulators/WitnessedRootHashList";
import { TransactionProof } from "../transaction/TransactionProvable";
import { BundleHashList, FieldTransition } from "../accumulators/BlockHashList";
import { NonMethods } from "../../utils/utils";

import { BlockHashMerkleTreeWitness } from "./accummulators/BlockHashMerkleTree";

export const BLOCK_ARGUMENT_BATCH_SIZE = 4;

export class BlockArguments extends Struct({
  afterBlockRootWitness: WitnessedRootWitness,
  transactionsHash: Field,
  pendingSTBatchesHash: FieldTransition,
  witnessedRootsHash: FieldTransition,
  isDummy: Bool,
}) {
  public static noop(
    state: NonMethods<Omit<BlockProverState, "blockWitness">>,
    stateRoot: Field
  ) {
    return new BlockArguments({
      afterBlockRootWitness: {
        witnessedRoot: stateRoot,
        preimage: Field(0),
      },
      transactionsHash: Field(0),
      pendingSTBatchesHash: {
        from: state.pendingSTBatches.commitment,
        to: state.pendingSTBatches.commitment,
      },
      witnessedRootsHash: {
        from: state.witnessedRoots.commitment,
        to: state.witnessedRoots.commitment,
      },
      isDummy: Bool(true),
    });
  }
}

export class BlockArgumentsBatch extends Struct({
  batch: Provable.Array(BlockArguments, BLOCK_ARGUMENT_BATCH_SIZE),
}) {}

export class BlockProverState {
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

  /**
   * The current state root of the block prover
   */
  stateRoot: Field;

  /**
   * The root of the merkle tree encoding all block hashes,
   * see `BlockHashMerkleTree`
   */
  blockHashRoot: Field;

  blockNumber: Field;

  blockWitness: BlockHashMerkleTreeWitness;

  networkState: NetworkState;

  constructor(args: {
    networkState: NetworkState;
    eternalTransactionsList: TransactionHashList;
    pendingSTBatches: AppliedBatchHashList;
    stateRoot: Field;
    blockHashRoot: Field;
    blockNumber: Field;
    bundleList: BundleHashList;
    blockWitness: BlockHashMerkleTreeWitness;
    witnessedRoots: WitnessedRootHashList;
    incomingMessages: MinaActionsHashList;
  }) {
    this.bundleList = args.bundleList;
    this.eternalTransactionsList = args.eternalTransactionsList;
    this.pendingSTBatches = args.pendingSTBatches;
    this.stateRoot = args.stateRoot;
    this.blockHashRoot = args.blockHashRoot;
    this.blockNumber = args.blockNumber;
    this.networkState = args.networkState;
    this.blockWitness = args.blockWitness;
    this.witnessedRoots = args.witnessedRoots;
    this.incomingMessages = args.incomingMessages;
  }

  public toCommitments(): BlockProverPublicInput {
    return {
      remainders: {
        bundlesHash: this.bundleList.commitment,
        pendingSTBatchesHash: this.pendingSTBatches.commitment,
        witnessedRootsHash: this.witnessedRoots.commitment,
      },
      eternalTransactionsHash: this.eternalTransactionsList.commitment,
      incomingMessagesHash: this.incomingMessages.commitment,
      stateRoot: this.stateRoot,
      blockHashRoot: this.blockHashRoot,
      blockNumber: this.blockNumber,
      networkStateHash: this.networkState.hash(),
    };
  }

  public static blockProverFromCommitments(
    publicInput: BlockProverPublicInput,
    networkState: NetworkState,
    blockWitness: BlockHashMerkleTreeWitness
  ): BlockProverState {
    return new BlockProverState({
      bundleList: new BundleHashList(publicInput.remainders.bundlesHash),
      eternalTransactionsList: new TransactionHashList(
        publicInput.eternalTransactionsHash
      ),
      incomingMessages: new MinaActionsHashList(
        publicInput.incomingMessagesHash
      ),
      pendingSTBatches: new AppliedBatchHashList(
        publicInput.remainders.pendingSTBatchesHash
      ),
      witnessedRoots: new WitnessedRootHashList(
        publicInput.remainders.witnessedRootsHash
      ),
      stateRoot: publicInput.stateRoot,
      blockHashRoot: publicInput.blockHashRoot,
      blockNumber: publicInput.blockNumber,
      networkState,
      blockWitness,
    });
  }

  public copy() {
    return BlockProverState.fromFields(this.toFields());
  }

  public toFields() {
    return [
      this.bundleList.commitment,
      this.eternalTransactionsList.commitment,
      this.pendingSTBatches.commitment,
      this.incomingMessages.commitment,
      this.witnessedRoots.commitment,
      this.stateRoot,
      this.blockHashRoot,
      this.blockNumber,
      ...NetworkState.toFields(this.networkState),
      ...BlockHashMerkleTreeWitness.toFields(this.blockWitness),
    ];
  }

  // TODO Unit test
  public static fromFields(fields: Field[]) {
    return new BlockProverState({
      bundleList: new BundleHashList(fields[0]),
      eternalTransactionsList: new TransactionHashList(fields[1]),
      pendingSTBatches: new AppliedBatchHashList(fields[2]),
      incomingMessages: new MinaActionsHashList(fields[3]),
      witnessedRoots: new WitnessedRootHashList(fields[4]),
      stateRoot: fields[5],
      blockHashRoot: fields[6],
      blockNumber: fields[7],
      networkState: new NetworkState(NetworkState.fromFields(fields.slice(8))),
      blockWitness: new BlockHashMerkleTreeWitness(
        BlockHashMerkleTreeWitness.fromFields(
          fields.slice(8 + NetworkState.sizeInFields())
        )
      ),
    });
  }

  public static choose(
    condition: Bool,
    a: BlockProverState,
    b: BlockProverState
  ) {
    return new BlockProverState({
      bundleList: new BundleHashList(
        Provable.if(condition, a.bundleList.commitment, b.bundleList.commitment)
      ),
      eternalTransactionsList: new TransactionHashList(
        Provable.if(
          condition,
          a.eternalTransactionsList.commitment,
          b.eternalTransactionsList.commitment
        )
      ),
      pendingSTBatches: new AppliedBatchHashList(
        Provable.if(
          condition,
          a.pendingSTBatches.commitment,
          b.pendingSTBatches.commitment
        )
      ),
      incomingMessages: new MinaActionsHashList(
        Provable.if(
          condition,
          a.incomingMessages.commitment,
          b.incomingMessages.commitment
        )
      ),
      witnessedRoots: new WitnessedRootHashList(
        Provable.if(
          condition,
          a.witnessedRoots.commitment,
          b.witnessedRoots.commitment
        )
      ),
      stateRoot: Provable.if(condition, a.stateRoot, b.stateRoot),
      blockHashRoot: Provable.if(condition, a.blockHashRoot, b.blockHashRoot),
      blockWitness: new BlockHashMerkleTreeWitness(
        Provable.if(
          condition,
          BlockHashMerkleTreeWitness,
          a.blockWitness,
          b.blockWitness
        )
      ),
      blockNumber: Provable.if(condition, a.blockNumber, b.blockNumber),
      networkState: new NetworkState(
        Provable.if(condition, NetworkState, a.networkState, b.networkState)
      ),
    });
  }
}

export const BlockProverStateCommitments = {
  remainders: {
    // Commitment to the list of unprocessed (pending) batches of STs that need to be proven
    pendingSTBatchesHash: Field,
    witnessedRootsHash: Field,
    bundlesHash: Field,
  },
  eternalTransactionsHash: Field,
  incomingMessagesHash: Field,
  stateRoot: Field,
  blockHashRoot: Field,
  blockNumber: Field,
  networkStateHash: Field,
};

export class BlockProverPublicInput extends Struct(
  BlockProverStateCommitments
) {}

export class BlockProverPublicOutput extends Struct({
  ...BlockProverStateCommitments,
}) {
  public equals(input: BlockProverPublicInput): Bool {
    const output2 = BlockProverPublicOutput.toFields(input);
    const output1 = BlockProverPublicOutput.toFields(this);
    return output1
      .map((value1, index) => value1.equals(output2[index]))
      .reduce((a, b) => a.and(b));
  }
}

export type BlockProof = Proof<BlockProverPublicInput, BlockProverPublicOutput>;

export interface BlockProvable
  extends WithZkProgrammable<BlockProverPublicInput, BlockProverPublicOutput>,
    CompilableModule {
  proveBlockBatch: (
    publicInput: BlockProverPublicInput,
    networkState: NetworkState,
    blockWitness: BlockHashMerkleTreeWitness,
    stateTransitionProof: StateTransitionProof,
    deferSTProof: Bool,
    transactionProof: TransactionProof,
    deferTransactionProof: Bool,
    batch: BlockArgumentsBatch
  ) => Promise<BlockProverPublicOutput>;

  merge: (
    publicInput: BlockProverPublicInput,
    proof1: BlockProof,
    proof2: BlockProof
  ) => Promise<BlockProverPublicOutput>;
}
