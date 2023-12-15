/* eslint-disable max-statements */
import "reflect-metadata";
import { AreProofsEnabled, noop } from "@proto-kit/common";
import {
  assert,
  MethodPublicOutput,
  NetworkState,
  RuntimeMethodExecutionContext,
  RuntimeTransaction,
  StateMap,
  StateService,
  StateServiceProvider,
} from "@proto-kit/protocol";
import {
  Experimental,
  Field,
  PrivateKey,
  Proof,
  Provable,
  PublicKey,
  UInt64,
  verify,
} from "o1js";
import { container } from "tsyringe";

import {
  InMemoryStateService,
  MethodIdFactory,
  MethodIdResolver,
  Runtime,
  runtimeMethod,
  runtimeModule,
  RuntimeModule,
  state,
  toStateTransitionsHash,
} from "../src";

const timeout = 1000 * 60 * 100;

const program = Experimental.ZkProgram({
  publicInput: Field,
  publicOutput: Field,
  methods: {
    foo: {
      privateInputs: [],
      method: (p: Field) => {
        return p;
      },
    },
  },
});

const mergeProgram = Experimental.ZkProgram({
  publicInput: Field,
  methods: {
    foo: {
      privateInputs: [Experimental.ZkProgram.Proof(program)],
      method: (p: Field, proof: Proof<unknown, unknown>) => {
        proof.verify();
      },
    },
  },
});

console.log("merge", mergeProgram.analyzeMethods());

@runtimeModule()
class Balances extends RuntimeModule<Record<string, never>> {
  @state() public balances = StateMap.from<PublicKey, UInt64>(
    PublicKey,
    UInt64
  );

  @runtimeMethod()
  public transfer(from: PublicKey, to: PublicKey, amount: UInt64) {
    // read current balances
    const fromBalance = this.balances.get(from).value;
    const toBalance = this.balances.get(to).value;

    const fromIsSender = this.transaction.sender.equals(from);
    // check if from is the sender
    assert(fromIsSender, "Sender mismatch");

    // check if balance is sufficient
    const fromBalanceIsSufficient = fromBalance.greaterThanOrEqual(amount);
    assert(fromBalanceIsSufficient, "Insufficient balance");

    // naive implementation of 'safe sub' thats circuit friendly
    const paddedFrombalance = fromBalance.add(amount);
    const safeFromBalance = Provable.if<UInt64>(
      fromBalanceIsSufficient,
      UInt64,
      fromBalance,
      paddedFrombalance
    );

    // calculate new balances
    const newFromBalance = safeFromBalance.sub(amount);
    const newToBalance = toBalance.add(amount);

    this.balances.set(from, newFromBalance);
    this.balances.set(to, newToBalance);
  }
}

const areProofsEnabled = true;

describe("runtimeZkProgrammable", () => {
  it(
    "should compile",
    async () => {
      expect.assertions(5);

      class ScopedRuntime extends Runtime.from({
        modules: {
          Balances,
        },

        config: {
          Balances: {},
        },
      }) {}

      const runtimeContainer = container.createChildContainer();
      runtimeContainer.register<AreProofsEnabled>("AreProofsEnabled", {
        useValue: {
          areProofsEnabled,
          setProofsEnabled: noop,
        },
      });

      const stateService = new InMemoryStateService();
      runtimeContainer.register<StateService>("StateService", {
        useValue: stateService,
      });

      runtimeContainer.register<StateServiceProvider>("StateServiceProvider", {
        useClass: StateServiceProvider,
      });

      const runtime = new ScopedRuntime();

      runtimeContainer.register("Runtime", { useValue: runtime });
      runtime.create(() => runtimeContainer);

      const context = container.resolve<RuntimeMethodExecutionContext>(
        RuntimeMethodExecutionContext
      );

      const methodId = Field(
        runtime.dependencyContainer
          .resolve<MethodIdResolver>("MethodIdResolver")
          .getMethodId("Balances", "transfer")
      );

      const networkState = new NetworkState({
        block: {
          height: UInt64.from(0),
        },
      });

      // set a generic empty-ish context for compile
      context.setup({
        transaction: new RuntimeTransaction({
          sender: PublicKey.empty(),
          nonce: UInt64.zero,
          argsHash: Field(0),

          methodId: Field(0),
        }),

        networkState,
      });

      const zkProgram = runtime.zkProgrammable.zkProgram;

      console.time("compile");
      const artifact = await zkProgram.compile();
      console.timeEnd("compile");

      console.log("artifact", artifact.verificationKey);

      const alice = PrivateKey.random().toPublicKey();
      const bob = PrivateKey.random().toPublicKey();

      // set the right context for method execution and provin
      context.setup({
        transaction: new RuntimeTransaction({
          sender: alice,
          nonce: UInt64.zero,
          argsHash: Field(0),

          methodId,
        }),

        networkState,
      });

      const balances = runtime.resolve("Balances");

      // fill the state service, so that the transfer status is "true"
      stateService.set(
        balances.balances.getPath(alice),
        UInt64.from(100).toFields()
      );
      balances.transfer(alice, bob, UInt64.from(1));

      const currentContext = context.current();

      console.time("prove");
      const proof = await currentContext.result.prove<
        Proof<unknown, MethodPublicOutput>
      >();
      console.timeEnd("prove");

      const valid = await verify(proof, artifact.verificationKey);

      console.log(proof.toJSON());

      expect(valid).toBe(true);
      expect(proof.publicOutput.status.toBoolean()).toBe(
        currentContext.result.status.toBoolean()
      );
      expect(proof.publicOutput.stateTransitionsHash.toString()).toBe(
        toStateTransitionsHash(
          currentContext.result.stateTransitions
        ).toString()
      );
      expect(proof.publicOutput.transactionHash.toString()).toBe(
        currentContext.input?.transaction.hash().toString()
      );
      expect(proof.publicOutput.networkStateHash.toString()).toBe(
        currentContext.input?.networkState.hash().toString()
      );
    },
    timeout
  );
});
