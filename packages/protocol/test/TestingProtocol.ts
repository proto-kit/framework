import { container } from "tsyringe";
import { Runtime } from "@proto-kit/module";
import { Balance } from "@proto-kit/sequencer/test/integration/mocks/Balance";
import { NoopRuntime } from "@proto-kit/sequencer/test/integration/mocks/NoopRuntime";

import { Protocol, StateServiceProvider } from "../src";

export function createAndInitTestingProtocol() {
  const ProtocolClass = Protocol.from(Protocol.defaultModules());
  const protocol = new ProtocolClass();

  protocol.configure(Protocol.defaultConfig());

  const appChain = container.createChildContainer();

  appChain.register("Runtime", {
    useFactory: () => {
      const runtime = new (Runtime.from({
        Balance,
        NoopRuntime,
      }))();
      runtime.configure({
        Balance: {},
        NoopRuntime: {},
      });
      return runtime;
    },
  });
  protocol.create(() => appChain.createChildContainer());

  protocol.registerValue({
    StateServiceProvider: new StateServiceProvider(),
  });

  return protocol;
}
