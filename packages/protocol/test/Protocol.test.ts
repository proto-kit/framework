import "reflect-metadata";
import { VanillaProtocol } from "../src/protocol/Protocol";
import { beforeEach } from "@jest/globals";
import { BlockProver } from "../src/prover/block/BlockProver";
import { StateTransitionProver } from "../src/prover/statetransition/StateTransitionProver";
import { NoOpStateTransitionWitnessProvider } from "../src";

describe("protocol", () => {
  let protocol: ReturnType<typeof VanillaProtocol.create>;

  beforeEach(() => {
    protocol = VanillaProtocol.create();
  });

  it("should resolve all provers correctly", async () => {
    expect.assertions(2);

    protocol.dependencyContainer.register("StateTransitionWitnessProvider", {
      useValue: new NoOpStateTransitionWitnessProvider()
    })

    expect(protocol.blockProver instanceof BlockProver).toBe(true);
    expect(
      protocol.stateTransitionProver instanceof StateTransitionProver
    ).toBe(true);
  });
});
