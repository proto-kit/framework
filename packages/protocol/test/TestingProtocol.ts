import { container } from "tsyringe";
import { Runtime } from "@proto-kit/module";
import { Balance } from "@proto-kit/sequencer/test/integration/mocks/Balance";
import { NoopRuntime } from "@proto-kit/sequencer/test/integration/mocks/NoopRuntime";

import {
  AccountStateHook,
  BlockHeightHook,
  BlockProver,
  LastStateRootBlockHook,
  Protocol,
  StateServiceProvider,
  StateTransitionProver,
} from "../src";

export function createAndInitTestingProtocol() {
  const ProtocolClass = Protocol.from({
    modules: {
      StateTransitionProver: StateTransitionProver,
      BlockProver: BlockProver,
      AccountState: AccountStateHook,
      BlockHeight: BlockHeightHook,
      LastStateRoot: LastStateRootBlockHook,
    },
  });
  const protocol = new ProtocolClass();

  protocol.configure({
    BlockProver: {},
    AccountState: {},
    BlockHeight: {},
    StateTransitionProver: {},
    LastStateRoot: {},
  });

  const appChain = container.createChildContainer();

  appChain.register("Runtime", {
    useClass: Runtime.from({
      modules: {
        Balance,
        NoopRuntime,
      },
      config: {
        Balance: {},
        NoopRuntime: {},
      },
    }),
  });
  protocol.create(() => appChain.createChildContainer());

  protocol.registerValue({
    StateServiceProvider: new StateServiceProvider(),
  });

  return protocol;
}
