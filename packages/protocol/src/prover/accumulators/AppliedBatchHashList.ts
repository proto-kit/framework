import { Bool, Field } from "o1js";

import { DefaultProvableHashList } from "../../accumulators/ProvableHashList";
import { NonMethods } from "../../utils/utils";
import { AppliedStateTransitionBatch } from "../../model/AppliedStateTransitionBatch";

/**
 * A HashList for AppliedSTBatches, that in addition to the default
 * functionality, checks that the pushed batches are not empty.
 * If they are, the pushing is skipped.
 * Note that if the batch has applied: false, the batch still has to be appended
 * if it has STs inside
 */
export class AppliedBatchHashList extends DefaultProvableHashList<
  NonMethods<AppliedStateTransitionBatch>
> {
  public constructor(commitment: Field = Field(0)) {
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
