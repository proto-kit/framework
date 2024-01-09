import { Bool, Field, Proof, Struct } from "o1js";
import { WithZkProgrammable } from "@proto-kit/common";

import { StateTransitionProof } from "../statetransition/StateTransitionProvable";
import { MethodPublicOutput } from "../../model/MethodPublicOutput";
import { ProtocolTransaction } from "../../model/transaction/ProtocolTransaction";
import { NetworkState } from "../../model/network/NetworkState";
import { BlockTransactionPosition } from "./BlockTransactionPosition";
import { BlockHashMerkleTreeWitness } from "./acummulators/BlockHashMerkleTree";

export class BlockProverPublicInput extends Struct({
  transactionsHash: Field,
  stateRoot: Field,
  networkStateHash: Field,
  blockHashRoot: Field,
  eternalTransactionsHash: Field,
}) {}

export class BlockProverPublicOutput extends Struct({
  transactionsHash: Field,
  stateRoot: Field,
  networkStateHash: Field,
  blockHashRoot: Field,
  eternalTransactionsHash: Field,
}) {}

export type BlockProverProof = Proof<
  BlockProverPublicInput,
  BlockProverPublicOutput
>;

export class BlockProverExecutionData extends Struct({
  transaction: ProtocolTransaction,
  networkState: NetworkState,
}) {}

export interface BlockProvable
  extends WithZkProgrammable<BlockProverPublicInput, BlockProverPublicOutput> {
  proveTransaction: (
    publicInput: BlockProverPublicInput,
    stateProof: StateTransitionProof,
    appProof: Proof<void, MethodPublicOutput>,
    executionData: BlockProverExecutionData
  ) => BlockProverPublicOutput;

  newBlock: (
    publicInput: BlockProverPublicInput,
    networkState: NetworkState,
    lastBlockWitness: BlockHashMerkleTreeWitness,
    nextBlockWitness: BlockHashMerkleTreeWitness,
    stateTransitionProof: StateTransitionProof
  ) => BlockProverPublicOutput;

  merge: (
    publicInput: BlockProverPublicInput,
    proof1: BlockProverProof,
    proof2: BlockProverProof
  ) => BlockProverPublicOutput;
}
