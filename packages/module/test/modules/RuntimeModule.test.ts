/* eslint-disable jest/no-restricted-matchers */
import "reflect-metadata";
import { Balances } from "./Balances";
import { InMemoryStateService, Runtime } from "../../src";
import { Admin } from "./Admin";

describe("runtimeModule", () => {
  it("should resolve configs correctly", () => {
    expect.assertions(5);

    const runtime = Runtime.from({
      state: new InMemoryStateService(),

      runtimeModules: {
        Admin,
        Balances,
      },
    });

    runtime.configure({
      Admin: {
        publicKey: "123",
      },

      Balances: {},
    });

    // eslint-disable-next-line @typescript-eslint/dot-notation
    const childContainer = runtime["runtimeContainer"];

    expect(childContainer.isRegistered("Admin")).toBe(true);
    expect(childContainer.isRegistered("Balances")).toBe(true);

    const resolvedAdmin = childContainer.resolve<Admin>("Admin");

    expect(resolvedAdmin).toBeDefined();

    const { config } = resolvedAdmin;

    expect(config).toBeDefined();
    expect(config.publicKey).toBe("123");
  });
});