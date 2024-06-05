import { ModulesConfig } from "@proto-kit/common";
import { StateServiceProvider } from "@proto-kit/protocol";
import { container } from "tsyringe";

import { InMemoryStateService, Runtime, RuntimeModulesRecord } from "../src";

export function createTestingRuntime<Modules extends RuntimeModulesRecord>(
  modules: Modules,
  config: ModulesConfig<Modules>
): {
  runtime: Runtime<Modules>;
  state: InMemoryStateService;
} {
  const state = new InMemoryStateService();

  const Runtimeclass = Runtime.from({
    modules,
  });
  const runtime = new Runtimeclass();

  runtime.configure(config);

  runtime.create(() => container.createChildContainer());

  runtime.dependencyContainer.register("AreProofsEnabled", {
    useValue: {
      areProofsEnabled: false,

      setProofsEnabled(areProofsEnabled: boolean) {
        this.areProofsEnabled = areProofsEnabled;
      },
    },
  });
  runtime.registerValue({
    StateServiceProvider: new StateServiceProvider(),
    Runtime: runtime,
  });

  runtime.stateServiceProvider.setCurrentStateService(state);

  return {
    runtime,
    state,
  };
}
