import { FungibleToken } from "mina-fungible-token";

import { MinaBaseLayerConfig } from "../src";
import { settlementTestFn } from "../test/settlement/Settlement";

// Disabled this for now since the CI for this will likely fail
describe.skip("Settlement contracts: local blockchain - proven", () => {
  const network: MinaBaseLayerConfig = {
    network: {
      type: "local",
    },
  };

  describe("Default token", () => {
    settlementTestFn("proven", network, undefined, 500_000);
  });

  describe("Custom token", () => {
    settlementTestFn(
      "proven",
      network,
      {
        tokenOwner: FungibleToken,
      },
      500_000
    );
  });
});
