import { Field, Proof, SelfProof, Struct } from "snarkyjs";
import { StateTransitionProvableBatch } from "../../model/StateTransitionProvableBatch";

export class StateTransitionProverPublicInput extends Struct({
  stateTransitionsHash: Field,
  stateRoot: Field,
}) {}

export class StateTransitionProverPublicOutput extends Struct({
  stateTransitionsHash: Field,
  stateRoot: Field,
}) {}

export type StateTransitionProof = Proof<StateTransitionProverPublicInput, StateTransitionProverPublicOutput>

export interface StateTransitionProvable {
  runBatch: (
    publicInput: StateTransitionProverPublicInput,
    batch: StateTransitionProvableBatch
  ) => StateTransitionProverPublicInput

  merge: (
    publicInput: StateTransitionProverPublicInput,
    proof1: StateTransitionProof,
    proof2: StateTransitionProof
  ) => StateTransitionProverPublicInput
}