import "reflect-metadata";
import { MethodIdResolver, Runtime, RuntimeModule } from "@proto-kit/module";
import { ChildContainerProvider } from "@proto-kit/common";
import { Protocol, ProtocolModule } from "@proto-kit/protocol";
import { VanillaProtocolModules } from "@proto-kit/library";
import { Sequencer, SequencerModule } from "@proto-kit/sequencer";
import { PrivateKey } from "o1js";

import { AppChain } from "../src";

class TestRuntimeModule extends RuntimeModule<object> {
  public initialized = false;

  public create(childContainerProvider: ChildContainerProvider) {
    super.create(childContainerProvider);

    // Just to test if it doesn't throw
    childContainerProvider();

    this.initialized = true;
  }
}

class TestProtocolModule extends ProtocolModule<object> {
  public initialized = false;

  public create() {
    this.initialized = true;
  }
}

class TestSequencerModule extends SequencerModule<object> {
  public initialized = false;

  public started = false;

  public create() {
    this.initialized = true;
  }

  public async start(): Promise<void> {
    this.started = true;
  }
}

describe("modularization", () => {
  it("should initialize all modules correctly", async () => {
    const appChain = AppChain.from({
      Runtime: Runtime.from({
        modules: {
          TestRuntimeModule,
        },
      }),
      Protocol: Protocol.from({
        modules: VanillaProtocolModules.with({
          TestProtocolModule,
        }),
      }),
      Sequencer: Sequencer.from({
        modules: {
          TestSequencerModule,
        },
      }),
      modules: {},
    });

    appChain.configurePartial({
      Runtime: {
        TestRuntimeModule: {},
      },
      Protocol: {
        AccountState: {},
        BlockProver: {},
        StateTransitionProver: {},
        BlockHeight: {},
        LastStateRoot: {},
        TransactionFee: {
          tokenId: 0n,
          feeRecipient: PrivateKey.random().toPublicKey().toBase58(),
          baseFee: 0n,
          perWeightUnitFee: 0n,
          methods: {},
        },
        TestProtocolModule: {},
      },
      Sequencer: {
        TestSequencerModule: {},
      },
    });

    await appChain.start();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const m = appChain.protocol.resolve("TestProtocolModule");

    expect(appChain.runtime.resolve("TestRuntimeModule").initialized).toBe(
      true
    );
    expect(appChain.protocol.resolve("TestProtocolModule").initialized).toBe(
      true
    );
    expect(appChain.sequencer.resolve("TestSequencerModule").initialized).toBe(
      true
    );
    expect(appChain.sequencer.resolve("TestSequencerModule").started).toBe(
      true
    );

    expect(appChain.runtime.dependencyContainer.isRegistered("Runtime")).toBe(
      false
    );

    // Tests that the DependencyFactory got executed
    expect(
      appChain.runtime.resolveOrFail("MethodIdResolver", MethodIdResolver)
    ).toBeDefined();
  });
});
