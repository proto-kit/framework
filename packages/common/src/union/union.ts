import { Provable, Struct, Field, InferProvable } from "o1js";

import { padArray } from "../utils";

export function createUnion<T extends Provable<any>[]>(provables: T) {
  const maxLength = Math.max(
    ...provables.map((provable) => provable.sizeInFields())
  );

  class ProvableUnion extends Struct({
    array: Provable.Array(Field, maxLength),
  }) {
    static from<Type extends T[number]>(
      provable: Type,
      value: InferProvable<Type>
    ) {
      const fields = provable.toFields(value);
      const fullFields = padArray(fields, maxLength, () => Field(0));
      return new ProvableUnion({ array: fullFields });
    }

    into<Type extends T[number]>(provable: Type): InferProvable<Type> {
      const size = provable.sizeInFields();
      const fields = this.array.slice(0, size);

      this.array.slice(size).forEach((field) => field.assertEquals(0));

      return provable.fromFields(fields, []);
    }
  }

  return ProvableUnion;
}
