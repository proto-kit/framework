import { InMemoryStateService, Runtime } from "../src";
import { Balances } from "./modules/Balances";
import { Bool } from "snarkyjs";

describe("runtime", () => {

  it("should encode methodnames correctly", () => {
    const runtime = Runtime.from({
      state: new InMemoryStateService(),
      modules: {
        Balances: Balances
      },
      config: {
        Balances: {
          test: Bool(true)
        }
      }
    })

    const balances = runtime.resolve("Balances")
    expect(balances).toBeDefined();

    console.log(Object.keys(balances));
    console.log(balances.getTotalSupply);

    const moduleName = "Balances";
    const methodName = "getTotalSupply";

    const methodId = runtime.getMethodId(moduleName, methodName);
    const method = runtime.getMethodById(methodId)

    // eslint-disable-next-line jest/no-restricted-matchers
    expect(method).toBeDefined();

  })

})