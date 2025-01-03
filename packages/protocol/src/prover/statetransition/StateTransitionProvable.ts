import { Field, Proof, Struct } from "o1js";
import { WithZkProgram } from "@proto-kit/common";

import { StateTransitionProvableBatch } from "../../model/StateTransitionProvableBatch";

export class StateTransitionProverPublicInput extends Struct({
  stateTransitionsHash: Field,
  protocolTransitionsHash: Field,
  stateRoot: Field,
  protocolStateRoot: Field,
}) {}

export class StateTransitionProverPublicOutput extends Struct({
  stateTransitionsHash: Field,
  protocolTransitionsHash: Field,
  stateRoot: Field,
  protocolStateRoot: Field,
}) {}

export type StateTransitionProof = Proof<
  StateTransitionProverPublicInput,
  StateTransitionProverPublicOutput
>;

export interface StateTransitionProvable
  extends WithZkProgram<
    StateTransitionProverPublicInput,
    StateTransitionProverPublicOutput
  > {
  runBatch: (
    publicInput: StateTransitionProverPublicInput,
    batch: StateTransitionProvableBatch
  ) => Promise<StateTransitionProverPublicOutput>;

  merge: (
    publicInput: StateTransitionProverPublicInput,
    proof1: StateTransitionProof,
    proof2: StateTransitionProof
  ) => Promise<StateTransitionProverPublicOutput>;
}
