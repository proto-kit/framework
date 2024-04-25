import "reflect-metadata";
import { Bool, Field, PublicKey, UInt64 } from "o1js";
import {
  NetworkState,
  PublicKeyOption,
  RuntimeMethodExecutionContext,
  RuntimeTransaction,
  UInt64Option,
} from "@proto-kit/protocol";
import { container } from "tsyringe";
import { AreProofsEnabled, log } from "@proto-kit/common";

import { InMemoryStateService, MethodIdResolver, Runtime } from "../src";
import { MethodParameterEncoder } from "../src/method/MethodParameterEncoder";

import { Balances } from "./modules/Balances";
import { createTestingRuntime } from "./TestingRuntime";

describe("runtimeMethod", () => {
  const parameters = [PublicKey.empty()];

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
    // eslint-disable-next-line jest/prefer-expect-assertions
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
    module.getBalance(PublicKey.empty());

    await expect(context.current().result.prover!()).rejects.toThrow(
      "Runtimemethod called with wrong methodId on the transaction object"
    );
  });
});
