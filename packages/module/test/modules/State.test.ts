import "reflect-metadata";
import { PublicKey, UInt64 } from "o1js";
import { container } from "tsyringe";
import {
  NetworkState,
  Option,
  RuntimeMethodExecutionContext,
  RuntimeTransaction,
} from "@proto-kit/protocol";
import { expectDefined } from "@proto-kit/common";

import { Runtime } from "../../src";
import { createTestingRuntime } from "../TestingRuntime";

import { Admin } from "./Admin";
import { Balances } from "./Balances";

describe("state", () => {
  let balances: Balances;

  let runtime: Runtime<{
    Admin: typeof Admin;
    Balances: typeof Balances;
  }>;

  function createChain() {
    ({ runtime } = createTestingRuntime(
      {
        Admin,
        Balances,
      },
      {
        Admin: {
          publicKey: PublicKey.empty<typeof PublicKey>().toBase58(),
        },
        Balances: {},
      }
    ));

    balances = runtime.resolve("Balances");
  }

  beforeEach(() => {
    createChain();
  });

  describe("state decorator", () => {
    it("should decorate state properties correctly", () => {
      expectDefined(balances.totalSupply.path);
    });
  });

  describe("transient state", () => {
    it("should track previously set state", () => {
      expect.assertions(2);

      const executionContext = container.resolve(RuntimeMethodExecutionContext);
      executionContext.setup({
        networkState: NetworkState.empty(),
        transaction: RuntimeTransaction.dummyTransaction(),
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
});
