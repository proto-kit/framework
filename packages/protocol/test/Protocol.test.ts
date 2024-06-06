import "reflect-metadata";
import { beforeEach } from "@jest/globals";

import { BlockProver } from "../src/prover/block/BlockProver";
import { StateTransitionProver } from "../src/prover/statetransition/StateTransitionProver";
import { ProvableTransactionHook } from "../src";

import { createAndInitTestingProtocol } from "./TestingProtocol";

describe("protocol", () => {
  beforeEach(() => {});

  it("should resolve all provers correctly", async () => {
    expect.assertions(2);

    const protocol = createAndInitTestingProtocol();

    expect(protocol.blockProver instanceof BlockProver).toBe(true);
    expect(
      protocol.stateTransitionProver instanceof StateTransitionProver
    ).toBe(true);
  });

  it("should initialize hooks correctly", () => {
    expect.assertions(2);

    const protocol = createAndInitTestingProtocol();

    const hooks =
      protocol.dependencyContainer.resolveAll<ProvableTransactionHook>(
        "ProvableTransactionHook"
      );

    expect(hooks).toHaveLength(1);
    expect(hooks[0].name).toBe("AccountState");
  });
});
