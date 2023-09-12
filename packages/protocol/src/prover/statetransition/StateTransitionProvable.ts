import { Field, Proof, Struct } from "snarkyjs";
import { WithZkProgrammable, ZkProgrammable } from "@proto-kit/common";

import { StateTransitionProvableBatch } from "../../model/StateTransitionProvableBatch";

import { StateTransitionWitnessProviderReference } from "./StateTransitionWitnessProviderReference";

export class StateTransitionProverPublicInput extends Struct({
  stateTransitionsHash: Field,
  protocolTransitionsHash: Field,
  stateRoot: Field,
}) {}

export class StateTransitionProverPublicOutput extends Struct({
  stateTransitionsHash: Field,
  protocolTransitionsHash: Field,
  stateRoot: Field,
}) {}

export type StateTransitionProof = Proof<
  StateTransitionProverPublicInput,
  StateTransitionProverPublicOutput
>;

export interface StateTransitionProvable
  extends WithZkProgrammable<
    StateTransitionProverPublicInput,
    StateTransitionProverPublicOutput
  > {
  witnessProviderReference: StateTransitionWitnessProviderReference;

  runBatch: (
    publicInput: StateTransitionProverPublicInput,
    batch: StateTransitionProvableBatch
  ) => StateTransitionProverPublicOutput;

  merge: (
    publicInput: StateTransitionProverPublicInput,
    proof1: StateTransitionProof,
    proof2: StateTransitionProof
  ) => StateTransitionProverPublicOutput;
}
