import "reflect-metadata";

import { MethodIdResolver } from "../src";

import { Balances } from "./modules/Balances";
import { createTestingRuntime } from "./TestingRuntime";

describe("runtime", () => {
  it("should encode methodnames correctly", () => {
    expect.assertions(2);

    const { runtime } = createTestingRuntime(
      {
        Balances,
      },
      {
        Balances: {},
      }
    );

    const balances = runtime.resolve("Balances");

    expect(balances).toBeDefined();

    console.log(Object.keys(balances));
    console.log(balances.getTotalSupply);

    const moduleName = "Balances";
    const methodName = "getTotalSupply";

    const methodId = runtime.dependencyContainer
      .resolve<MethodIdResolver>("MethodIdResolver")
      .getMethodId(moduleName, methodName);
    const method = runtime.getMethodById(methodId);

    expect(method).toBeDefined();
  });
});
