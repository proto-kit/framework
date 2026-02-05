import { PrivateKey, TokenId } from "o1js";
import { FungibleToken } from "mina-fungible-token";
import { SettlementTokenConfig } from "@proto-kit/sequencer";

import { developmentConfig, inmemoryConfig, sovereignConfig } from "../config";

import { Environment } from "./types";

export function getConfigs(preset: Environment) {
  switch (preset) {
    case "development":
      return developmentConfig;
    case "sovereign":
      return sovereignConfig;
    case "inmemory":
    default:
      return inmemoryConfig;
  }
}
export function resolveEnv<T extends object>(
  preset: Environment = "inmemory",
  envs?: Partial<T> | undefined
): T {
  const config = getConfigs(preset);
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  if (!envs) return config as T;
  const resolved = { ...config, ...envs } satisfies Partial<T>;
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return resolved as T;
}
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
