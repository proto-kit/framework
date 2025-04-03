import "reflect-metadata";
import { Runtime } from "@proto-kit/module";
import { Balances, VanillaProtocolModules } from "@proto-kit/library";
import { Protocol, StateTransitionProverType } from "@proto-kit/protocol";

import { AppChain, InMemoryDatabase, Sequencer } from "../../src";

/* eslint-disable @typescript-eslint/no-unused-vars */

function foo() {
  // We want this code to only typecheck, not execute

  const app = AppChain.from({
    Runtime: Runtime.from({
      Balances,
    }),
    Protocol: Protocol.from(VanillaProtocolModules.with({})),
    Sequencer: Sequencer.from({
      Database: InMemoryDatabase,
    }),
  });

  const case1 = app.protocol.resolve(
    "StateTransitionProver"
  ) satisfies StateTransitionProverType;
  const case2 = app
    .resolve("Protocol")
    .resolve("StateTransitionProver") satisfies StateTransitionProverType;

  const case3 = app.runtime.resolve("Balances") satisfies Balances<unknown>;
  const case4 = app
    .resolve("Runtime")
    .resolve("Balances") satisfies Balances<unknown>;

  const case5 = app.sequencer.resolve("Database") satisfies InMemoryDatabase;
  const case6 = app
    .resolve("Sequencer")
    .resolve("Database") satisfies InMemoryDatabase;
}

it("dummy", () => {
  expect(1).toBe(1);
});

/* eslint-enable @typescript-eslint/no-unused-vars */
