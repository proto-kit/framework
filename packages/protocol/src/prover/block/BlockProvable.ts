import { Field, Proof, Struct } from "snarkyjs";
import { ZkProgrammable } from "@proto-kit/common";

import { StateTransitionProof } from "../statetransition/StateTransitionProvable";
import { MethodPublicOutput } from "../../model/MethodPublicOutput";
import { ProtocolTransaction } from "../../model/transaction/ProtocolTransaction";
import { NetworkState } from "../../model/network/NetworkState";

export class BlockProverPublicInput extends Struct({
  transactionsHash: Field,
  stateRoot: Field,
  networkStateHash: Field,
}) {}

export class BlockProverPublicOutput extends Struct({
  transactionsHash: Field,
  stateRoot: Field,
}) {}

export type BlockProverProof = Proof<
  BlockProverPublicInput,
  BlockProverPublicOutput
>;

export class BlockProverExecutionData extends Struct({
  transaction: ProtocolTransaction,
  networkState: NetworkState,
  // accountstate
}) {}

export interface BlockProvable
  extends ZkProgrammable<BlockProverPublicInput, BlockProverPublicOutput> {
  proveTransaction: (
    publicInput: BlockProverPublicInput,
    stateProof: StateTransitionProof,
    appProof: Proof<void, MethodPublicOutput>,
    executionData: BlockProverExecutionData
  ) => BlockProverPublicOutput;

  merge: (
    publicInput: BlockProverPublicInput,
    proof1: BlockProverProof,
    proof2: BlockProverProof
  ) => BlockProverPublicOutput;
}
