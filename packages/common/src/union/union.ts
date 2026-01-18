import { Provable, Struct, Field, InferProvable, Unconstrained } from "o1js";

import { padArray } from "../utils";

export function createQualifiedUnion<
  T extends (Provable<any> & { name: string })[],
>(provables: T) {
  const maxLength = Math.max(
    ...provables.map((provable) => provable.sizeInFields())
  );

  const typeMap = Object.fromEntries(
    provables.map(({ name }, index) => [name, index])
  );

  class ProvableUnion extends Struct({
    array: Provable.Array(Field, maxLength),
    type: Field,
  }) {
    public static from<Type extends T[number]>(
      provable: Type,
      value: InferProvable<Type>
    ) {
      const fields = provable.toFields(value);
      const fullFields = padArray(fields, maxLength, () => Field(0));
      return new ProvableUnion({
        array: fullFields,
        type: Field(typeMap[provable.name]),
      });
    }

    public into<Type extends T[number]>(provable: Type): InferProvable<Type> {
      const size = provable.sizeInFields();
      const fields = this.array.slice(0, size);

      this.array.slice(size).forEach((field) => field.assertEquals(0));

      this.type.assertEquals(typeMap[provable.name]);

      return provable.fromFields(fields, []);
    }
  }

  return ProvableUnion;
}
