import { settlementTestFn } from "../test/settlement/Settlement";
import { PrivateKey } from "o1js";
import { log } from "@proto-kit/common";

console.log(PrivateKey.random().toPublicKey().toBase58());

log.setLevel("DEBUG");

describe.each(["signed"] as const)(
  "settlement contracts: lightnet - %s",
  (type) => {
    settlementTestFn(
      type,
      {
        network: {
          type: "lightnet",
          graphql: "http://127.0.0.1:8080/graphql",
          archive: "http://127.0.0.1:8282",
          accountManager: "http://127.0.0.1:8181",
        },
      },
      4240_000
    );
  }
);
