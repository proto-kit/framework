import { Bool, Field, Provable, Struct } from "o1js";

export class FieldOption extends Struct({
  isSome: Bool,
  value: Field,
}) {
  public static from(isSome: Bool, potentialValue: Field) {
    return {
      isSome,
      value: Provable.if(isSome, potentialValue, Field(0)),
    };
  }
}
