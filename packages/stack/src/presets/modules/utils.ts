import { PrivateKey, TokenId } from "o1js";
import { FungibleToken } from "mina-fungible-token";
import { SettlementTokenConfig } from "@proto-kit/sequencer";

export function buildCustomTokenConfig(
  customTokenPrivateKey?: string,
  customTokenBridgePrivateKey?: string
): SettlementTokenConfig {
  if (
    customTokenPrivateKey === undefined ||
    customTokenBridgePrivateKey === undefined
  ) {
    return {};
  }
  const pk = PrivateKey.fromBase58(customTokenPrivateKey);
  const tokenId = TokenId.derive(pk.toPublicKey()).toString();

  const tokenOwner = new FungibleToken(
    PrivateKey.fromBase58(customTokenPrivateKey).toPublicKey()
  );

  return {
    [tokenId]: {
      tokenOwner: tokenOwner,
      bridgingContractPublicKey: PrivateKey.fromBase58(
        customTokenBridgePrivateKey
      ).toPublicKey(),
      tokenOwnerPublicKey: pk.toPublicKey(),
    },
  };
}
export function buildSettlementTokenConfig(
  bridgePrivateKey?: string,
  customTokens: SettlementTokenConfig = {}
): SettlementTokenConfig {
  return {
    ...(bridgePrivateKey !== undefined
      ? {
          "1": {
            bridgingContractPublicKey:
              PrivateKey.fromBase58(bridgePrivateKey).toPublicKey(),
          },
        }
      : {}),
    ...customTokens,
  };
}
