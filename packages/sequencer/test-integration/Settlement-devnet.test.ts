import { describe } from "@jest/globals";
import { settlementTestFn } from "../test/settlement/Settlement";
import { MinaBaseLayerConfig } from "../src";
import { FungibleToken } from "mina-fungible-token";
import { PrivateKey } from "o1js";

describe("Settlement - Devnet", () => {
  const network: MinaBaseLayerConfig = {
    network: {
      type: "remote",
      graphql: "https://api.minascan.io/node/devnet/v1/graphql",
      archive: "https://api.minascan.io/archive/devnet/v1/graphql",
      // type: "local"
    },
  };

  const sequencerKey = PrivateKey.fromBase58(
    "EKFBrGinEnesgbsNJMHikKVSJxxcRQBaSUEi55jD5YfQeRxVLBKN"
  );

  it.skip("Random pk", () => {
    const pk = PrivateKey.random();
    console.log(pk.toBase58());
    console.log(pk.toPublicKey().toBase58());
  });

  describe("Default token", () => {
    settlementTestFn("proven", network, undefined, 500_000, sequencerKey);
  });

  describe("Custom token", () => {
    settlementTestFn(
      "proven",
      network,
      {
        tokenOwner: FungibleToken,
      },
      500_000,
      sequencerKey
    );
  });
});
