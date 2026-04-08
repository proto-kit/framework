import { FungibleToken } from "mina-fungible-token";

import { MinaBaseLayerConfig } from "../../src";

import { settlementTestFn } from "./Settlement";
import { settlementOnlyTestFn } from "./Settlement-only";

describe.each(["mock-proofs", "signed"] as const)(
  "Settlement contracts: local blockchain - %s",
  (type) => {
    const network: MinaBaseLayerConfig = {
      network: {
        type: "local",
      },
    };

    describe.only("Default token", () => {
      settlementTestFn(type, network);
    });

    describe("Custom token", () => {
      settlementTestFn(type, network, {
        tokenOwner: FungibleToken,
      });
    });

    describe("Settlement only", () => {
      settlementOnlyTestFn(type, network);
    });
  }
);
