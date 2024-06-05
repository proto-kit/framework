import "reflect-metadata";

import { Bool, Field, Poseidon } from "o1js";

import { Option, ProvableOption } from "../../src";

describe("option", () => {
  it.each([
    [Bool(true), Field(0), Field, true],
    [Bool(false), Field(0), Field, false],
  ])(
    "should serialize to the correct tree value",
    (isSome, value, valueType, shouldHash) => {
      expect.assertions(1);

      const option = Option.from(isSome, value, valueType);
      const treeValue = shouldHash ? Poseidon.hash(value.toFields()) : Field(0);

      expect(option.treeValue.toString()).toStrictEqual(treeValue.toString());
    }
  );

  it.each([
    [
      Option.from(Bool(true), Field(5), Field),
      { isSome: true, value: Poseidon.hash([Field(5)]) },
      false,
    ],
    [
      Option.from(Bool(true), Field(0), Field),
      { isSome: true, value: Poseidon.hash([Field(0)]) },
      false,
    ],
    [
      Option.from(Bool(false), Field(0), Field),
      { isSome: true, value: Field(0) },
      true,
    ],
    [
      Option.from(Bool(false), Field(1), Field),
      { isSome: false, value: Field(0) },
      false,
    ],
  ])(
    "should encode to correct provable",
    (option, provableTemplate, forceSome) => {
      expect.assertions(4);

      if (forceSome) {
        option.forceSome();
      }

      const provableInput = new ProvableOption({
        isSome: Bool(provableTemplate.isSome),
        value: provableTemplate.value,
      });

      const provable = option.toProvable();
      const fields = ProvableOption.toFields(provable);

      expect(provable.value.toBigInt()).toStrictEqual(
        provableInput.value.toBigInt()
      );
      expect(provable.isSome.toBoolean()).toStrictEqual(
        provableInput.isSome.toBoolean()
      );

      expect(fields[0]).toStrictEqual(provableInput.isSome.toFields()[0]);
      expect(fields[1]).toStrictEqual(provableInput.value);
    }
  );
});
