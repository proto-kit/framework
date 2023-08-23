import { Bool } from "snarkyjs";

import { InMemoryStateService, Runtime } from "../src";

import { Balances } from "./modules/Balances";

describe("runtime", () => {
  it("should encode methodnames correctly", () => {
    expect.assertions(2);

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

    const balances = runtime.resolve("Balances");

    expect(balances).toBeDefined();

    console.log(Object.keys(balances));
    console.log(balances.getTotalSupply);

    const moduleName = "Balances";
    const methodName = "getTotalSupply";

    const methodId = runtime.methodIdResolver.getMethodId(
      moduleName,
      methodName
    );
    const method = runtime.getMethodById(methodId);

    // eslint-disable-next-line jest/no-restricted-matchers
    expect(method).toBeDefined();
  });
});
