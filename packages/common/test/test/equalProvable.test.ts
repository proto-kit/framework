import { Field } from "o1js";

import { equalProvable } from "../../src";

describe("test equalProvable", () => {
  it.each([
    [[1, 2], [1, 2], true],
    [[1, 2], [1, 3], false],
    [[2, 2], [1, 2], false],
    [[2, 2, 4, 5, 6], [2, 2, 4, 5, 6], true],
  ])("should match correctly", (expected, received, matching) => {
    expect.assertions(2);

    const result = equalProvable(
      expected.map((v) => Field(v)),
      received.map((v) => Field(v))
    );

    expect(result.pass).toStrictEqual(matching);
  });
});
