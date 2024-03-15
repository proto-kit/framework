import { Bool, Field } from "o1js";
import { AppliedStateTransitionBatch } from "../model/StateTransitionProvableBatch";
import { DefaultProvableHashList } from "./ProvableHashList";

/**
 * A HashList for AppliedSTBatches, that in addition to the default
 * functionality, checks that the pushed batches are not empty.
 * If they are, the pushing is skipped.
 * Note that if the batch has applied: false, the batch still has to be appended
 * if it has STs inside
 */
export class AppliedBatchHashList extends DefaultProvableHashList<AppliedStateTransitionBatch> {
  public constructor(commitment: Field) {
    super(AppliedStateTransitionBatch, commitment);
  }

  private isNotEmpty(value: AppliedStateTransitionBatch): Bool {
    return value.batchHash.equals(Field(0)).not();
  }

  public push(value: AppliedStateTransitionBatch) {
    return super.pushIf(value, this.isNotEmpty(value));
  }

  public pushIf(value: AppliedStateTransitionBatch, condition: Bool) {
    return super.pushIf(value, condition.and(this.isNotEmpty(value)));
  }
}
