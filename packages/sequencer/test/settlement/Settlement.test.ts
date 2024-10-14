import { settlementTestFn } from "./Settlement";

describe.each(["mock-proofs", "signed"] as const)(
  "settlement contracts: localblockchain - %s",
  (type) => {
    settlementTestFn(type, {
      network: {
        type: "local",
      },
    });
  }
);
