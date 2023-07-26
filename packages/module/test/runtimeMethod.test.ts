import "reflect-metadata";
import { Bool, PublicKey } from "snarkyjs";

import { InMemoryStateService, Runtime } from "../src";
import { MethodParameterDecoder } from "../src/method/MethodParameterDecoder";

import { Balances } from "./modules/Balances";

describe("runtimeMethod", () => {
  const parameters = [PublicKey.empty()];

  it("should create correct param types", () => {
    // eslint-disable-next-line jest/prefer-expect-assertions
    expect.assertions(1 + parameters.length);

    const runtime = Runtime.from({
      state: new InMemoryStateService(),

      modules: {
        Balances,
      },

      config: {
        Balances: {
          test: Bool(true),
        },
      },
    });

    const module = runtime.resolve("Balances");

    const decoder = MethodParameterDecoder.fromMethod(module, "getBalance");
    const recodedParameters = decoder.fromFields(
      parameters.flatMap((x) => x.toFields())
    );

    expect(parameters).toHaveLength(recodedParameters.length);

    parameters.forEach((parameter, index) => {
      expect(parameter).toStrictEqual(recodedParameters[index]);
    });
  });
});
