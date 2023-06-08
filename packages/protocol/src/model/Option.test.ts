import { Bool, Field, Poseidon } from "snarkyjs";

import { Option } from "./Option";

describe("option", () => {
  it.each([
    // 1. Field(0)
    [Bool(true), Field(0), Field, true],
    // 2.
    [Bool(false), Field(0), Field, false],
  ])("should serialize to the correct tree value", (isSome, value, valueType, shouldHash) => {
    expect.assertions(1);

    const option = Option.from(isSome, value, valueType);
    // eslint-disable-next-line jest/no-conditional-in-test
    const treeValue = shouldHash ? Poseidon.hash(value.toFields()) : Field(0);

    expect(option.treeValue.toString()).toStrictEqual(treeValue.toString());
  });
});
