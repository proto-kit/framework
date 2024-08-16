import { settlementTestFn } from "./Settlement";

describe.each(["signed", "mock-proofs"] as const)(
  "settlement contracts: localblockchain - %s",
  (type) => {
    settlementTestFn(type, {
      network: {
        type: "local",
      },
    });
  }
);
