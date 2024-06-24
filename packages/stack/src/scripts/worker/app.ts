import { Runtime } from "@proto-kit/module";
import {
  VanillaRuntimeModules,
  VanillaProtocolModules,
} from "@proto-kit/library";
import { Protocol } from "@proto-kit/protocol";
import { ModulesConfig, ModuleContainer, TypedClass } from "@proto-kit/common";

import { TestBalances } from "../graphql/server";

const runtime = Runtime.from({
  modules: VanillaRuntimeModules.with({
    Balance2: TestBalances,
  }),
});

const protocol = Protocol.from({
  modules: VanillaProtocolModules.mandatoryModules({}),
});

type ExtractConfigType<T> =
  T extends TypedClass<ModuleContainer<infer Config>>
    ? ModulesConfig<Config>
    : {};

export const app = {
  Runtime: runtime,

  Protocol: protocol,

  config: {
    runtime: {
      Balances: {},
      Balance2: {},
    } satisfies ExtractConfigType<typeof runtime>,
    protocol: {
      AccountState: {},
      BlockProver: {},
      BlockHeight: {},
      StateTransitionProver: {},
      LastStateRoot: {},
    } satisfies ExtractConfigType<typeof protocol>,
  },
};
