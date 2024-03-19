import "reflect-metadata";
import { Protocol, VanillaProtocol } from "../src/protocol/Protocol";
import { beforeEach } from "@jest/globals";
import { BlockProver } from "../src/prover/block/BlockProver";
import { StateTransitionProver } from "../src/prover/statetransition/StateTransitionProver";
import {
  NoOpStateTransitionWitnessProvider,
  ProvableTransactionHook,
} from "../src";
import { AccountStateHook } from "../src/blockmodules/AccountStateHook";

describe("protocol", () => {
  beforeEach(() => {});

  it("should resolve all provers correctly", async () => {
    expect.assertions(2);

    const protocol = VanillaProtocol.create();

    protocol.dependencyContainer.register("StateTransitionWitnessProvider", {
      useValue: new NoOpStateTransitionWitnessProvider(),
    });

    expect(protocol.blockProver instanceof BlockProver).toBe(true);
    expect(
      protocol.stateTransitionProver instanceof StateTransitionProver
    ).toBe(true);
  });

  it.only("should initialize hooks correctly", () => {
    expect.assertions(2);

    const protocol = Protocol.from({
      modules: {
        BlockProver,
        StateTransitionProver,
        AccountStateHook,
      },
    });

    const hooks =
      protocol.dependencyContainer.resolveAll<ProvableTransactionHook>(
        "ProvableTransactionHook"
      );

    expect(hooks).toHaveLength(1);
    expect(hooks[0].name).toBe("AccountStateHook");
  });
});
