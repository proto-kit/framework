import "reflect-metadata";
import { Field } from "snarkyjs";

import { stringToField } from "../src";

describe("stringToField", () => {
  const stringToFieldInputs: string[] = [];

  // eslint-disable-next-line jest/require-hook
  [31, 32, 33, 63, 64, 65, 1000].forEach((length) => {
    stringToFieldInputs.push(
      // eslint-disable-next-line array-func/from-map
      Array.from({ length })
        .map(() => "A")
        .reduce((a, b) => a + b)
    );
  });

  it.each(
    ["", "a", "Helloasdlsdaglsdiousdioagiosadgoisaudogiusadogusoadgds"].concat(
      stringToFieldInputs
    )
  )("should encode without errors", (input) => {
    expect.assertions(1);

    const field = stringToField(input);

    expect(field.toBigInt()).toBeGreaterThan(0n);
  });
});
