import { beforeAll, describe } from "@jest/globals";
import {
  InMemoryStateService,
  Runtime,
  runtimeMethod,
  runtimeModule,
  RuntimeModule,
  state,
} from "@proto-kit/module";
import {
  NetworkState,
  RuntimeMethodExecutionContext,
  RuntimeTransaction,
  State,
  StateMap,
} from "@proto-kit/protocol";
import { Field, PublicKey, UInt64 } from "o1js";
import { TestingAppChain } from "@proto-kit/sdk";

import { CachedStateService } from "../../src";
import { RuntimeMethodExecution } from "../../src/protocol/production/unproven/RuntimeMethodExecution";

@runtimeModule()
export class TestModule extends RuntimeModule<{}> {
  @state() state1 = State.from(Field);

  @state() state2 = State.from(Field);

  @state() map = StateMap.from(Field, Field);

  @runtimeMethod()
  public performAction(inputKey: Field) {
    this.map.get(inputKey);
    this.map.set(inputKey, Field(1));

    const state1 = this.state1.get();
    const state2 = this.state2.get();

    const compKey = state1.value.add(state2.value);
    const value = this.map.get(compKey);
    this.map.set(compKey, value.value.add(Field(10)));
  }
}

describe("test the correct key extraction for runtime methods", () => {
  const stateService = new CachedStateService(undefined);

  let context: RuntimeMethodExecutionContext;
  let execution: RuntimeMethodExecution;
  let module: TestModule;

  beforeAll(async () => {
    const appchain = TestingAppChain.fromRuntime({
      modules: {
        TestModule,
      },

      config: {
        TestModule: {},
      },
    });

    await appchain.start();

    module = appchain.runtime.resolve("TestModule");
    stateService.set(module.state1.path!, [Field(5)]);
    stateService.set(module.state2.path!, [Field(10)]);

    context = appchain.runtime.dependencyContainer.resolve(
      RuntimeMethodExecutionContext
    );
    execution = new RuntimeMethodExecution(
      appchain.runtime,
      appchain.protocol,
      context
    );
  });

  it("test if simulation is done correctly", async () => {
    expect.assertions(1);

    const c = {
      networkState: new NetworkState({ block: { height: UInt64.one } }),

      transaction: new RuntimeTransaction({
        sender: PublicKey.empty(),
        nonce: UInt64.zero,
        methodId: Field(0),
        argsHash: Field(0),
      }),
    };

    console.time("Simulating...")

    const sts = await execution.simulateMultiRound(
      () => {
        module.performAction(Field(5));
      },
      c,
      new CachedStateService(stateService)
    );

    console.timeEnd("Simulating...")

    const path = module.map.getPath(Field(15));

    expect(sts[4].path.toString()).toBe(path.toString());
  });
});
