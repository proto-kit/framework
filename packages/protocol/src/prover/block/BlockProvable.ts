import { Bool, Field, Proof, Struct } from "o1js";
import { WithZkProgrammable } from "@proto-kit/common";

import { StateTransitionProof } from "../statetransition/StateTransitionProvable";
import { MethodPublicOutput } from "../../model/MethodPublicOutput";
import { ProtocolTransaction } from "../../model/transaction/ProtocolTransaction";
import { NetworkState } from "../../model/network/NetworkState";

import { BlockHashMerkleTreeWitness } from "./accummulators/BlockHashMerkleTree";

export class BlockProverPublicInput extends Struct({
  transactionsHash: Field,
  stateRoot: Field,
  networkStateHash: Field,
  blockHashRoot: Field,
  eternalTransactionsHash: Field,
  // closed: Bool,
}) {}

export class BlockProverPublicOutput extends Struct({
  transactionsHash: Field,
  stateRoot: Field,
  networkStateHash: Field,
  blockHashRoot: Field,
  eternalTransactionsHash: Field,
  closed: Bool,
  blockNumber: Field,
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

  proveBlock: (
    publicInput: BlockProverPublicInput,
    networkState: NetworkState,
    blockWitness: BlockHashMerkleTreeWitness,
    stateTransitionProof: StateTransitionProof,
    transactionProof: BlockProverProof
  ) => BlockProverPublicOutput;

  merge: (
    publicInput: BlockProverPublicInput,
    proof1: BlockProverProof,
    proof2: BlockProverProof
  ) => BlockProverPublicOutput;
}
