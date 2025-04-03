import { ClientAppChain, InMemorySigner } from "@proto-kit/sdk";
import {
  VanillaProtocolModules,
  VanillaRuntimeModules,
} from "@proto-kit/library";
import { Runtime } from "@proto-kit/module";
import { Protocol } from "@proto-kit/protocol";

import { TestBalances } from "../graphql/server";

const client = ClientAppChain.fromRemoteEndpoint(
  Runtime.from({
    modules: VanillaRuntimeModules.with({
      Balance2: TestBalances,
    }),
  }),
  Protocol.from({
    modules: VanillaProtocolModules.mandatoryModules({}),
  }),
  InMemorySigner
);

client.configurePartial({
  Runtime: {
    Balances: {},
    Balance2: {},
  },
});

export { client };
