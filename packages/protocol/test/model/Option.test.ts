import { Bool, Field, Poseidon } from "o1js";

import { Option } from "../../src";

describe("option", () => {
  it.each([
    [Bool(true), Field(0), Field, true],
    [Bool(false), Field(0), Field, false],
  ])(
    "should serialize to the correct tree value",
    (isSome, value, valueType, shouldHash) => {
      expect.assertions(1);

      const option = Option.from(isSome, value, valueType);
      // eslint-disable-next-line jest/no-conditional-in-test
      const treeValue = shouldHash ? Poseidon.hash(value.toFields()) : Field(0);

      expect(option.treeValue.toString()).toStrictEqual(treeValue.toString());
    }
  );
});
