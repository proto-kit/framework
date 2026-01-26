import { Bool, Field, Poseidon, Proof, Provable, Struct } from "o1js";
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

const BlockProverStateBaseFields = {
  eternalTransactionsHash: Field,
  incomingMessagesHash: Field,
  stateRoot: Field,
  blockHashRoot: Field,
  blockNumber: Field,
  networkStateHash: Field,
};

export class BlockProverPublicInput extends Struct({
  // Tracker of the current block prover state
  proverStateRemainder: Field,
  ...BlockProverStateBaseFields,
}) {
  public equals(input: BlockProverPublicInput): Bool {
    const output2 = BlockProverPublicInput.toFields(input);
    const output1 = BlockProverPublicInput.toFields(this);
    return output1
      .map((value1, index) => value1.equals(output2[index]))
      .reduce((a, b) => a.and(b));
  }

  public clone() {
    return new BlockProverPublicInput(
      BlockProverPublicInput.fromFields(BlockProverPublicInput.toFields(this))
    );
  }
}

export const BlockProverStateCommitments = {
  remainders: {
    // Commitment to the list of unprocessed (pending) batches of STs that need to be proven
    pendingSTBatchesHash: Field,
    witnessedRootsHash: Field,
    bundlesHash: Field,
    witnessedRootsPreimage: Field,
  },
  ...BlockProverStateBaseFields,
};

export class BlockProverStateInput extends Struct(BlockProverStateCommitments) {
  public hash() {
    return Poseidon.hash(BlockProverStateInput.toFields(this));
  }

  public static fromPublicInput(input: BlockProverPublicInput) {
    return new BlockProverStateInput({
      remainders: {
        bundlesHash: Field(0),
        pendingSTBatchesHash: Field(0),
        witnessedRootsHash: Field(0),
        witnessedRootsPreimage: Field(0),
      },
      eternalTransactionsHash: input.eternalTransactionsHash,
      incomingMessagesHash: input.incomingMessagesHash,
      stateRoot: input.stateRoot,
      blockHashRoot: input.blockHashRoot,
      blockNumber: input.blockNumber,
      networkStateHash: input.networkStateHash,
    });
  }

  public finalize(condition: Bool) {
    condition
      .implies(
        this.remainders.bundlesHash
          .equals(0)
          .and(this.remainders.pendingSTBatchesHash.equals(0))
          .and(this.remainders.witnessedRootsHash.equals(0))
      )
      .assertTrue("Remainers not fully removed");

    return new BlockProverPublicInput({
      proverStateRemainder: Field(0),
      eternalTransactionsHash: this.eternalTransactionsHash,
      incomingMessagesHash: this.incomingMessagesHash,
      stateRoot: this.stateRoot,
      blockHashRoot: this.blockHashRoot,
      blockNumber: this.blockNumber,
      networkStateHash: this.networkStateHash,
    });
  }
}

export class BlockProverPublicOutput extends BlockProverPublicInput {}

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

  public toCommitments(): BlockProverStateInput {
    return new BlockProverStateInput({
      remainders: {
        bundlesHash: this.bundleList.commitment,
        pendingSTBatchesHash: this.pendingSTBatches.commitment,
        witnessedRootsHash: this.witnessedRoots.commitment,
        witnessedRootsPreimage: this.witnessedRoots.preimage,
      },
      eternalTransactionsHash: this.eternalTransactionsList.commitment,
      incomingMessagesHash: this.incomingMessages.commitment,
      stateRoot: this.stateRoot,
      blockHashRoot: this.blockHashRoot,
      blockNumber: this.blockNumber,
      networkStateHash: this.networkState.hash(),
    });
  }

  public static blockProverFromCommitments(
    stateInput: NonMethods<BlockProverStateInput>,
    networkState: NetworkState,
    blockWitness: BlockHashMerkleTreeWitness
  ): BlockProverState {
    return new BlockProverState({
      bundleList: new BundleHashList(stateInput.remainders.bundlesHash),
      eternalTransactionsList: new TransactionHashList(
        stateInput.eternalTransactionsHash
      ),
      incomingMessages: new MinaActionsHashList(
        stateInput.incomingMessagesHash
      ),
      pendingSTBatches: new AppliedBatchHashList(
        stateInput.remainders.pendingSTBatchesHash
      ),
      witnessedRoots: new WitnessedRootHashList(
        stateInput.remainders.witnessedRootsHash,
        stateInput.remainders.witnessedRootsPreimage
      ),
      stateRoot: stateInput.stateRoot,
      blockHashRoot: stateInput.blockHashRoot,
      blockNumber: stateInput.blockNumber,
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
      this.witnessedRoots.preimage,
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
      witnessedRoots: new WitnessedRootHashList(fields[4], fields[5]),
      stateRoot: fields[6],
      blockHashRoot: fields[7],
      blockNumber: fields[8],
      networkState: new NetworkState(NetworkState.fromFields(fields.slice(9))),
      blockWitness: new BlockHashMerkleTreeWitness(
        BlockHashMerkleTreeWitness.fromFields(
          fields.slice(9 + NetworkState.sizeInFields())
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
        ),
        Provable.if(
          condition,
          a.witnessedRoots.preimage,
          b.witnessedRoots.preimage
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

export type BlockProof = Proof<BlockProverPublicInput, BlockProverPublicOutput>;

export interface BlockProvable
  extends WithZkProgrammable<BlockProverPublicInput, BlockProverPublicOutput>,
    CompilableModule {
  proveBlockBatch: (
    publicInput: BlockProverPublicInput,
    stateWitness: BlockProverStateInput,
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
