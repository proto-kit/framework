import { FungibleToken } from "mina-fungible-token";

import { MinaBaseLayerConfig } from "../../src";

import { settlementTestFn } from "./Settlement";

describe.each(["mock-proofs", "signed"] as const)(
  "Settlement contracts: local blockchain - %s",
  (type) => {
    const network: MinaBaseLayerConfig = {
      network: {
        type: "local",
      },
    };

    describe("Default token", () => {
      settlementTestFn(type, network);
    });

    describe("Custom token", () => {
      settlementTestFn(type, network, {
        tokenOwner: FungibleToken,
      });
    });
  }
);
