import { Field, Proof, Struct } from "o1js";
import { WithZkProgrammable, ZkProgrammable } from "@proto-kit/common";

import {
  AppliedStateTransitionBatch,
  AppliedStateTransitionBatchState,
  MerkleWitnessBatch,
  StateTransitionProvableBatch,
} from "../../model/StateTransitionProvableBatch";

import { StateTransitionWitnessProviderReference } from "./StateTransitionWitnessProviderReference";

export class StateTransitionProverPublicInput extends Struct({
  batchesHash: Field,
  currentBatchStateHash: Field,
  root: Field,
}) {}

export class StateTransitionProverPublicOutput extends Struct({
  batchesHash: Field,
  currentBatchStateHash: Field,
  root: Field,
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
  runBatch: (
    publicInput: StateTransitionProverPublicInput,
    batch: StateTransitionProvableBatch,
    witnesses: MerkleWitnessBatch,
    currentAppliedBatch: AppliedStateTransitionBatchState
  ) => StateTransitionProverPublicOutput;

  merge: (
    publicInput: StateTransitionProverPublicInput,
    proof1: StateTransitionProof,
    proof2: StateTransitionProof
  ) => StateTransitionProverPublicOutput;
}
