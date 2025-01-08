import {
  PlainZkProgram,
  WithZkProgram,
  ZkProgramFactory,
} from "@proto-kit/common";
import { container } from "tsyringe";

import {
  AccountStateHook,
  BlockHeightHook,
  BlockProver,
  LastStateRootBlockHook,
  MethodPublicOutput,
  Protocol,
  StateTransitionProver,
} from "../src";

class RuntimeMock implements WithZkProgram<undefined, MethodPublicOutput> {
  zkProgramFactory: ZkProgramFactory<undefined, MethodPublicOutput> =
    undefined as unknown as ZkProgramFactory<undefined, MethodPublicOutput>;

  zkProgram: PlainZkProgram<undefined, MethodPublicOutput>[] =
    undefined as unknown as PlainZkProgram<undefined, MethodPublicOutput>[];
}

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
  protocol.create(() => container.createChildContainer());

  protocol.registerValue({
    Runtime: new RuntimeMock(),
  });

  protocol.dependencyContainer.register("AreProofsEnabled", {
    useValue: {
      areProofsEnabled: false,

      setProofsEnabled(areProofsEnabled: boolean) {
        this.areProofsEnabled = areProofsEnabled;
      },
    },
  });
  return protocol;
}
