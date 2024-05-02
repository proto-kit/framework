import "reflect-metadata";
import { PublicKey } from "o1js";
import {
  NetworkState,
  RuntimeMethodExecutionContext,
  RuntimeTransaction,
} from "@proto-kit/protocol";
import { container } from "tsyringe";
import { AreProofsEnabled, log } from "@proto-kit/common";

import { Runtime, MethodParameterEncoder } from "../src";

import { Balances } from "./modules/Balances";
import { createTestingRuntime } from "./TestingRuntime";

describe("runtimeMethod", () => {
  const parameters = [PublicKey.empty<typeof PublicKey>()];

  let runtime: Runtime<{ Balances: typeof Balances }>;

  beforeEach(() => {
    log.setLevel(log.levels.DEBUG);
    ({ runtime } = createTestingRuntime(
      {
        Balances,
      },
      {
        Balances: {},
      }
    ));
  });

  it("should create correct param types", () => {
    expect.assertions(1 + parameters.length);

    const module = runtime.resolve("Balances");

    const decoder = MethodParameterEncoder.fromMethod(module, "getBalance");
    const recodedParameters = decoder.decodeFields(
      parameters.flatMap((x) => x.toFields())
    );

    expect(parameters).toHaveLength(recodedParameters.length);

    parameters.forEach((parameter, index) => {
      expect(parameter).toStrictEqual(recodedParameters[index]);
    });
  });

  it("should throw on incorrect methodId on tx", async () => {
    expect.assertions(1);

    const context = container.resolve(RuntimeMethodExecutionContext);

    runtime.registerValue({
      AppChain: {
        areProofsEnabled: false,
      } as AreProofsEnabled,
    });

    context.setup({
      transaction: RuntimeTransaction.dummyTransaction(),
      networkState: NetworkState.empty(),
    });

    const module = runtime.resolve("Balances");
    module.getBalance(PublicKey.empty<typeof PublicKey>());

    context.setup({
      transaction: RuntimeTransaction.dummyTransaction(),
      networkState: NetworkState.empty(),
    });

    await expect(context.current().result.prover!()).rejects.toThrow(
      "Runtimemethod called with wrong methodId on the transaction object"
    );
  });
});
