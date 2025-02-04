import { Runtime } from "@proto-kit/module";
import { Protocol } from "@proto-kit/protocol";
import { VanillaProtocolModules } from "@proto-kit/library";
import { ModulesConfig } from "@proto-kit/common";
import { BullQueueConfig } from "@proto-kit/deployment";

import { ProvenBalance } from "../../test/integration/mocks/ProvenBalance";
import { ProtocolStateTestHook } from "../../test/integration/mocks/ProtocolStateTestHook";

export const runtimeClass = Runtime.from({
  modules: {
    Balance: ProvenBalance,
  },

  config: {
    Balance: {},
  },
});

export const protocolClass = Protocol.from({
  modules: VanillaProtocolModules.mandatoryModules({
    ProtocolStateTestHook,
  }),
});

export const runtimeProtocolConfig: ModulesConfig<{
  Runtime: typeof runtimeClass;
  Protocol: typeof protocolClass;
}> = {
  Runtime: {
    Balance: {},
  },
  Protocol: {
    AccountState: {},
    BlockProver: {},
    StateTransitionProver: {},
    BlockHeight: {},
    LastStateRoot: {},
    ProtocolStateTestHook: {},
  },
};

export const BullConfig: BullQueueConfig = {
  redis: {
    host: "localhost",
    port: 6379,
    password: "password",
    db: 1,
  },
};
