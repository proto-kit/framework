import { ClientAppChain, InMemorySigner } from "@proto-kit/sdk";
import { VanillaRuntimeModules } from "@proto-kit/library";

import { TestBalances } from "../graphql/server";

const client = ClientAppChain.fromRuntime(
  VanillaRuntimeModules.with({
    Balance2: TestBalances,
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
