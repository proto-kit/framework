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

    const localNetwork: MinaBaseLayerConfig = {
      network: {
        type:'lightnet',
        archive:'http://127.0.0.1:8282',
        accountManager:'http://127.0.0.1:8181',
        graphql: 'http://127.0.0.1:8080/graphql',
      }
    }

    describe("Default token", () => {
      settlementTestFn(type, network);
    });

    describe("Custom token", () => {
      settlementTestFn(type, network, {
        tokenOwner: FungibleToken,
      });
    });
    
    describe("Default token in lightnet", () => {
      settlementTestFn(type,localNetwork);
    });
  }
);
