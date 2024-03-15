import { Field, Proof, Struct } from "o1js";
import { WithZkProgrammable, CompilableModule } from "@proto-kit/common";

import {
  AppliedStateTransitionBatch,
  AppliedStateTransitionBatchState,
  MerkleWitnessBatch,
  StateTransitionProvableBatch,
} from "../../model/StateTransitionProvableBatch";

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
    >,
    CompilableModule {
  runBatch: (
    publicInput: StateTransitionProverPublicInput,
    batch: StateTransitionProvableBatch,
    witnesses: MerkleWitnessBatch,
    currentAppliedBatch: AppliedStateTransitionBatchState
  ) => Promise<StateTransitionProverPublicOutput>;

  merge: (
    publicInput: StateTransitionProverPublicInput,
    proof1: StateTransitionProof,
    proof2: StateTransitionProof
  ) => Promise<StateTransitionProverPublicOutput>;
}
