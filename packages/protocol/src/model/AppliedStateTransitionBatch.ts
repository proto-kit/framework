import { Bool, Field, Poseidon, Provable, Struct } from "o1js";

export class AppliedStateTransitionBatch extends Struct({
  batchHash: Field,
  applied: Bool,
}) {}

export class AppliedStateTransitionBatchState extends Struct({
  batchHash: Field,
  root: Field,
}) {
  public hashOrZero(): Field {
    const hash = Poseidon.hash(AppliedStateTransitionBatchState.toFields(this));
    return Provable.if(this.batchHash.equals(0), Field(0), hash);
  }
}
