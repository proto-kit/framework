import { Bool, Field, Poseidon, Provable } from "o1js";

import { ProvableHashList } from "./ProvableHashList";

export class ProvableReductionHashList<Value> extends ProvableHashList<Value> {
  public unconstrainedList: Value[] = [];

  private constrainedLastValue: Value | undefined = undefined;

  private preimage: Field = this.commitment;

  public pushAndReduce(
    value: Value,
    reduce: (previous: Value) => [Value, Bool]
  ): { popLast: Bool; value: Value } {
    let valueToPush = value;
    let popLast = Bool(false);

    // Theoretically, we can feed the preimage + last value as a witness
    // for non-zero commitment starts (like used in the BlockProver), because
    // currently it won't reduce across chunks. But this is okay for now I think
    if (this.constrainedLastValue !== undefined) {
      [valueToPush, popLast] = reduce(this.constrainedLastValue);
    }

    Provable.asProver(() => {
      if (popLast.toBoolean()) {
        this.unconstrainedList.pop();
      }

      const valueAsConstant = this.valueType.fromFields(
        this.valueType.toFields(valueToPush).map((field) => field.toConstant())
      );
      this.unconstrainedList.push(valueAsConstant);
    });

    const currentCommitment = this.commitment;
    const noPopCommitment = this.hash([
      currentCommitment,
      ...this.valueType.toFields(valueToPush),
    ]);

    const popCommitment = this.hash([
      this.preimage,
      ...this.valueType.toFields(valueToPush),
    ]);

    this.commitment = Provable.if(popLast, popCommitment, noPopCommitment);

    this.constrainedLastValue = valueToPush;
    this.preimage = Provable.if(popLast, this.preimage, currentCommitment);

    return {
      popLast,
      value: valueToPush,
    };
  }

  public pushIf(value: Value, condition: Bool) {
    throw new Error("pushIf is not implemented for ReducedHashList");

    return this;
  }

  public hash(elements: Field[]): Field {
    return Poseidon.hash(elements);
  }
}
