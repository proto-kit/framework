import { PrivateKey } from "o1js";
import { log } from "@proto-kit/common";

import { settlementTestFn } from "../test/settlement/Settlement";
import { FungibleToken } from "mina-fungible-token";

console.log(PrivateKey.random().toPublicKey().toBase58());

log.setLevel("DEBUG");

describe.each(["signed"] as const)(
  "settlement contracts: lightnet - %s",
  (type) => {
    const network = {
      network: {
        type: "lightnet",
        graphql: "http://127.0.0.1:8080/graphql",
        archive: "http://127.0.0.1:8282",
        accountManager: "http://127.0.0.1:8181",
      },
    } as const;

    describe("Default token", () => {
      settlementTestFn(type, network, undefined, 360_000);
    });

    describe("Custom token", () => {
      settlementTestFn(
        type,
        network,
        {
          tokenOwner: FungibleToken,
        },
        360_000
      );
    });
  }
);
