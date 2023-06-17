/* eslint-disable jest/no-restricted-matchers */
import "reflect-metadata";

import { Bool } from "snarkyjs";

import { InMemoryStateService, Runtime } from "../../src";

import { Balances } from "./Balances";
import { Admin } from "./Admin";

describe("runtimeModule", () => {
  it("should resolve configs correctly", () => {
    expect.assertions(5);

    const runtime = Runtime.from({
      state: new InMemoryStateService(),

      modules: {
        Admin,
        Balances,
      },
    });

    runtime.configure({
      Admin: {
        publicKey: "123",
      },

      Balances: {
        test: Bool(true),
      },
    });

    const childContainer = runtime.container;

    expect(childContainer.isRegistered("Admin")).toBe(true);
    expect(childContainer.isRegistered("Balances")).toBe(true);

    const resolvedAdmin = childContainer.resolve<Admin>("Admin");

    expect(resolvedAdmin).toBeDefined();

    const { config } = resolvedAdmin;

    expect(config).toBeDefined();
    expect(config.publicKey).toBe("123");
  });
});
