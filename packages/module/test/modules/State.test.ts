import "reflect-metadata";
import { Bool, PublicKey, UInt64 } from "snarkyjs";
import { container } from "tsyringe";
import { NetworkState, Option, RuntimeTransaction, StateService } from "@proto-kit/protocol";

import {
  InMemoryStateService,
  Runtime,
  RuntimeMethodExecutionContext,
} from "../../src";

import { Admin } from "./Admin";
import { Balances } from "./Balances";

describe("transient state", () => {
  let balances: Balances;

  let state: StateService;

  let runtime: Runtime<{
    Admin: typeof Admin;
    Balances: typeof Balances;
  }>;

  function createChain() {
    state = new InMemoryStateService();

    runtime = Runtime.from({
      state,

      modules: {
        Admin,
        Balances,
      },
    });

    runtime.dependencyContainer.register("AppChain", {
      useValue: {
        areProofsEnabled: false,

        setProofsEnabled(areProofsEnabled: boolean) {
          this.areProofsEnabled = areProofsEnabled;
        },
      },
    });

    runtime.configure({
      Admin: {
        publicKey: PublicKey.empty().toBase58(),
      },

      Balances: {
        test: Bool(true),
      },
    });

    balances = runtime.resolve("Balances");
  }

  beforeEach(() => {
    createChain();
  });

  it("should track previously set state", () => {
    const executionContext = container.resolve(RuntimeMethodExecutionContext);
    executionContext.setup({
      networkState: new NetworkState({ block: { height: UInt64.zero } }),
      transaction: undefined as unknown as RuntimeTransaction,
    });
    balances.transientState();

    const stateTransitions = executionContext
      .current()
      .result.stateTransitions.map((stateTransition) =>
        stateTransition.toProvable()
      );

    const expectedLastOption = Option.fromValue(
      UInt64.from(200),
      UInt64
    ).toProvable();

    const last = stateTransitions.at(-1);

    expect(last).toBeDefined();
    expect(last!.to.value).toStrictEqual(expectedLastOption.value);
  });
});
