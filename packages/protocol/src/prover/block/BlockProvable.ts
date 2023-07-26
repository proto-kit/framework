import { Field, Proof, Struct } from "snarkyjs";

import { StateTransitionProof } from "../statetransition/StateTransitionProvable";
import { MethodPublicOutput } from "../../model/MethodPublicOutput";
import { ZkProgrammable } from "@yab/common";

export class BlockProverPublicInput extends Struct({
  transactionsHash: Field,
  stateRoot: Field,
}) {}

export const BlockProverPublicOutput = BlockProverPublicInput;
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type BlockProverPublicOutput = BlockProverPublicInput;

export type BlockProverProof = Proof<
  BlockProverPublicInput,
  BlockProverPublicOutput
>;

export interface BlockProvable
  extends ZkProgrammable<BlockProverPublicInput, BlockProverPublicOutput> {
  proveTransaction: (
    publicInput: BlockProverPublicInput,
    stateProof: StateTransitionProof,
    appProof: Proof<void, MethodPublicOutput>
  ) => BlockProverPublicOutput;

  merge: (
    publicInput: BlockProverPublicInput,
    proof1: BlockProverProof,
    proof2: BlockProverProof
  ) => BlockProverPublicOutput;
}
