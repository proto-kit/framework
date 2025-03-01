import { Field } from "o1js";

import { DefaultProvableHashList } from "../../accumulators/ProvableHashList";

export class TransactionHashList extends DefaultProvableHashList<Field> {
  public constructor(commitment: Field = Field(0)) {
    super(Field, commitment);
  }
}
