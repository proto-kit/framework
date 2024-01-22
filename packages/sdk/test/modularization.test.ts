/* eslint-disable max-classes-per-file */
import "reflect-metadata";
import {
  MethodIdResolver,
  Runtime,
  runtimeModule,
  RuntimeModule,
} from "@proto-kit/module";
import { ChildContainerProvider, log } from "@proto-kit/common";
import { AppChain, AppChainModule } from "../src";
import { Protocol, ProtocolModule } from "@proto-kit/protocol";
import { VanillaProtocol } from "@proto-kit/library";
import { Sequencer, SequencerModule } from "@proto-kit/sequencer";

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

class TestAppChainModule extends AppChainModule<object> {
  public initialized = false;

  public create() {
    this.initialized = true;
  }
}

describe("modularization", () => {
  it("should initialize all modules correctly", async () => {
    const appChain = AppChain.from({
      runtime: Runtime.from({
        modules: {
          TestRuntimeModule,
        },
      }),
      protocol: VanillaProtocol.from({
        TestProtocolModule,
      }),
      sequencer: Sequencer.from({
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
        TestProtocolModule: {},
        BlockProver: {},
        StateTransitionProver: {},
      },
      Sequencer: {
        TestSequencerModule: {},
      },
    });

    await appChain.start();

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
