import { Field, Proof, SelfProof, Struct } from "snarkyjs";
import { StateTransitionProof } from "../statetransition/StateTransitionProvable";
import { MethodPublicOutput } from "../../model/MethodPublicOutput";

export class BlockProverPublicInput extends Struct({
  transactionsHash: Field,
  stateRoot: Field,
}) {}

export const BlockProverPublicOutput = BlockProverPublicInput
export type BlockProverPublicOutput = BlockProverPublicInput

export type BlockProverProof = Proof<BlockProverPublicInput, BlockProverPublicOutput>

export interface BlockProvable {
  proveTransaction: (
    publicInput: BlockProverPublicInput,
    stateProof: StateTransitionProof,
    appProof: Proof<void, MethodPublicOutput>
  ) => BlockProverPublicOutput

  merge: (
    publicInput: BlockProverPublicInput,
    proof1: BlockProverProof,
    proof2: BlockProverProof
  ) => BlockProverPublicOutput
}