import "reflect-metadata";
import { Bool, Field, PublicKey, UInt64 } from "o1js";
import {
  NetworkState,
  RuntimeMethodExecutionContext,
  RuntimeTransaction,
} from "@proto-kit/protocol";
import { container } from "tsyringe";
import { AreProofsEnabled, log } from "@proto-kit/common";

import { InMemoryStateService, MethodIdResolver, Runtime } from "../src";
import { MethodParameterDecoder } from "../src/method/MethodParameterDecoder";

import { Balances } from "./modules/Balances";

describe("runtimeMethod", () => {
  const parameters = [PublicKey.empty()];

  let runtime: Runtime<{ Balances: typeof Balances }>;

  beforeEach(() => {
    log.setLevel(log.levels.DEBUG);
    runtime = Runtime.from({
      state: new InMemoryStateService(),

      modules: {
        Balances,
      },

      config: {
        Balances: {
          test: Bool(true),
        },
      },
    });
    runtime.start();
  });

  it("should create correct param types", () => {
    // eslint-disable-next-line jest/prefer-expect-assertions
    expect.assertions(1 + parameters.length);

    const module = runtime.resolve("Balances");

    const decoder = MethodParameterDecoder.fromMethod(module, "getBalance");
    const recodedParameters = decoder.fromFields(
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

    const transaction = new RuntimeTransaction({
      methodId: Field(0),
      nonce: UInt64.zero,
      argsHash: Field(0),
      sender: PublicKey.empty(),
    });

    context.setup({
      transaction,
      networkState: new NetworkState({ block: { height: UInt64.zero } }),
    });

    const module = runtime.resolve("Balances");
    module.getBalance(PublicKey.empty());

    context.setup({
      transaction,
      networkState: new NetworkState({ block: { height: UInt64.zero } }),
    });

    await expect(context.current().result.prover!()).rejects.toThrow(
      "Runtimemethod called with wrong methodId on the transaction object"
    );
  });
});
