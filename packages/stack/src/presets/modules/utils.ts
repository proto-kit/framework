import { PrivateKey, TokenId } from "o1js";
import { FungibleToken } from "mina-fungible-token";

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
) {
  if (
    customTokenPrivateKey === undefined ||
    customTokenBridgePrivateKey === undefined
  ) {
    return {};
  }
  const pk = PrivateKey.fromBase58(customTokenPrivateKey);
  const tokenId = TokenId.derive(pk.toPublicKey()).toString();
  return {
    [tokenId]: {
      bridgingContractPrivateKey: PrivateKey.fromBase58(
        customTokenBridgePrivateKey
      ),
      tokenOwner: FungibleToken,
      tokenOwnerPrivateKey: customTokenPrivateKey,
    },
  };
}
export function buildSettlementTokenConfig(
  bridgePrivateKey: string,
  customTokens: Record<string, unknown> = {}
) {
  return {
    "1": {
      bridgingContractPrivateKey: PrivateKey.fromBase58(bridgePrivateKey),
    },
    ...customTokens,
  };
}
