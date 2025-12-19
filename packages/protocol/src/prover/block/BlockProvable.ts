import { Bool, Field, Proof, Struct } from "o1js";
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
import {
  TransactionProof,
  TransactionProverState,
  TransactionProverStateCommitments,
} from "../transaction/TransactionProvable";

import { BlockHashMerkleTreeWitness } from "./accummulators/BlockHashMerkleTree";

export class BlockProverState extends TransactionProverState {
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

  constructor(args: {
    transactionList: TransactionHashList;
    networkState: NetworkState;
    eternalTransactionsList: TransactionHashList;
    pendingSTBatches: AppliedBatchHashList;
    incomingMessages: MinaActionsHashList;
    witnessedRoots: WitnessedRootHashList;
    stateRoot: Field;
    blockHashRoot: Field;
    blockNumber: Field;
  }) {
    super(args);
    this.stateRoot = args.stateRoot;
    this.blockHashRoot = args.blockHashRoot;
    this.blockNumber = args.blockNumber;
  }

  public toCommitments(): BlockProverPublicInput {
    return {
      ...super.toCommitments(),
      stateRoot: this.stateRoot,
      blockHashRoot: this.blockHashRoot,
      blockNumber: this.blockNumber,
    };
  }

  public static fromCommitments(
    publicInput: BlockProverPublicInput,
    networkState: NetworkState
  ): BlockProverState {
    return new BlockProverState({
      ...super.fromCommitments(publicInput, networkState),
      stateRoot: publicInput.stateRoot,
      blockHashRoot: publicInput.blockHashRoot,
      blockNumber: publicInput.blockNumber,
    });
  }
}

export const BlockProverStateCommitments = {
  ...TransactionProverStateCommitments,
  stateRoot: Field,
  blockHashRoot: Field,
  blockNumber: Field,
};

export class BlockProverPublicInput extends Struct(
  BlockProverStateCommitments
) {}

export class BlockProverPublicOutput extends Struct({
  ...BlockProverStateCommitments,
  closed: Bool,
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

export type BlockProof = Proof<BlockProverPublicInput, BlockProverPublicOutput>;

export interface BlockProvable
  extends WithZkProgrammable<BlockProverPublicInput, BlockProverPublicOutput>,
    CompilableModule {
  proveBlock: (
    publicInput: BlockProverPublicInput,
    networkState: NetworkState,
    blockWitness: BlockHashMerkleTreeWitness,
    stateTransitionProof: StateTransitionProof,
    deferSTs: Bool,
    afterBlockRootWitness: WitnessedRootWitness,
    transactionProof: TransactionProof
  ) => Promise<BlockProverPublicOutput>;

  merge: (
    publicInput: BlockProverPublicInput,
    proof1: BlockProof,
    proof2: BlockProof
  ) => Promise<BlockProverPublicOutput>;
}
