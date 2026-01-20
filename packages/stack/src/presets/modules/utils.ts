import { PrivateKey, TokenId } from "o1js";
import { developmentConfig, inmemoryConfig, sovereignConfig } from "../config";
import { FungibleToken } from "mina-fungible-token";
import { assertDefined } from "@proto-kit/common";
import {
  ApiEnv,
  CoreEnv,
  DatabaseEnv,
  DatabasePruneEnv,
  Environment,
  GraphqlServerEnv,
  IndexerEnv,
  MetricsEnv,
  ProcessorEnv,
  RedisEnv,
  SettlementEnv,
  TaskQueueEnv,
} from "./types";

function ensureDefined(obj: Record<string, any>, keys: string[]) {
  keys.forEach((k) => assertDefined(obj[k], `${k} is required`));
}
export function definePreset<T extends object>(
  base: T,
  overrides?: Partial<T>
): T {
  return {
    ...base,
    ...overrides,
  };
}
const MODULE_DEPENDENCIES: Record<string, string[]> = {
  Database: [],
  TaskQueue: [],
  OpenTelemetryServer: [],
  BaseLayer: [],
  FeeStrategy: [],

  Protocol: [],
  Mempool: ["Database"],
  BlockProducerModule: ["Database"],

  LocalTaskWorkerModule: ["TaskQueue"],
  TaskWorker: ["TaskQueue"],
  SequencerStartupModule: ["Database"],
  BatchProducerModule: ["Database"],
  BlockTrigger: ["BlockProducerModule", "BatchProducerModule"],

  SettlementModule: ["Database", "BaseLayer", "FeeStrategy"],

  DatabasePruneModule: ["Database"],

  Graphql: [],
  GraphqlServer: [],

  IndexBlockTask: ["Database", "TaskQueue"],
  IndexerNotifier: ["Database", "TaskQueue"],
  GeneratedResolverFactory: [],

  BlockFetching: [],
  HandlersExecutor: [],
  Trigger: ["BlockFetching", "HandlersExecutor"],
  ResolverFactory: [],
};
export function orderModulesByDependencies(
  modules: Record<string, any>
): Record<string, any> {
  const moduleSet = new Set(Object.keys(modules));
  const ordered: Record<string, any> = {};
  const visited = new Set<string>();

  function visit(name: string) {
    if (!moduleSet.has(name) || visited.has(name)) return;

    const deps = MODULE_DEPENDENCIES[name] ?? [];
    for (const dep of deps) {
      visit(dep);
    }

    visited.add(name);
    ordered[name] = modules[name];
  }

  for (const name of moduleSet) {
    visit(name);
  }

  return ordered;
}
export function resolveEnv<T extends object>(
  preset: Environment = "inmemory",
  envs?: Partial<T>
): T {
  return {
    ...getConfigs(preset),
    ...envs,
  } as T;
}
export function buildCustomTokenConfig(
  customTokenPrivateKey?: string,
  customTokenBridgePrivateKey?: string
): Record<string, any> {
  if (!customTokenPrivateKey || !customTokenBridgePrivateKey) {
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
  customTokens: Record<string, any> = {}
): Record<string, any> {
  return {
    "1": {
      bridgingContractPrivateKey: PrivateKey.fromBase58(bridgePrivateKey),
    },
    ...customTokens,
  };
}
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

export function parseApiEnv(envs: ApiEnv): {
  graphqlPort: number;
  graphqlHost: string;
  graphiqlEnabled: boolean;
} {
  ensureDefined(envs, [
    "PROTOKIT_GRAPHIQL_ENABLED",
    "PROTOKIT_GRAPHQL_HOST",
    "PROTOKIT_GRAPHQL_PORT",
  ]);
  return {
    graphqlPort: Number(envs.PROTOKIT_GRAPHQL_PORT),
    graphqlHost: envs.PROTOKIT_GRAPHQL_HOST,
    graphiqlEnabled: Boolean(envs.PROTOKIT_GRAPHIQL_ENABLED),
  };
}
export function parseCoreEnv(
  envs: CoreEnv,
  settlementEnabled?: boolean
): {
  blockInterval: number;
  settlementInterval?: number;
  minaBridgeKey?: string;
  customTokenKey?: string;
  customTokenBridgeKey?: string;
} {
  ensureDefined(envs, ["PROTOKIT_BLOCK_INTERVAL"]);
  if (settlementEnabled) {
    ensureDefined(envs, [
      "PROTOKIT_SETTLEMENT_INTERVAL",
      "PROTOKIT_MINA_BRIDGE_CONTRACT_PRIVATE_KEY",
    ]);
    if (envs.PROTOKIT_CUSTOM_TOKEN_PRIVATE_KEY) {
      ensureDefined(envs, ["PROTOKIT_CUSTOM_TOKEN_BRIDGE_PRIVATE_KEY"]);
    }
  }
  return {
    blockInterval: Number(envs.PROTOKIT_BLOCK_INTERVAL),
    settlementInterval: Number(envs.PROTOKIT_SETTLEMENT_INTERVAL),
    minaBridgeKey: envs.PROTOKIT_MINA_BRIDGE_CONTRACT_PRIVATE_KEY,
    customTokenKey: envs.PROTOKIT_CUSTOM_TOKEN_PRIVATE_KEY,
    customTokenBridgeKey: envs.PROTOKIT_CUSTOM_TOKEN_BRIDGE_PRIVATE_KEY,
  };
}
export function parseMetricsEnv(envs: MetricsEnv): {
  metricsEnabled: boolean;
  metricsHost?: string;
  metricsPort?: number;
  metricsScrapingFrequency?: number;
  tracingEnabled: boolean;
  tracingUrl?: string;
} {
  ensureDefined(envs as Record<string, any>, [
    "OPEN_TELEMETRY_METRICS_ENABLED",
    "OPEN_TELEMETRY_TRACING_ENABLED",
    "OPEN_TELEMETRY_TRACING_URL",
    "OPEN_TELEMETRY_METRICS_HOST",
    "OPEN_TELEMETRY_METRICS_PORT",
    "OPEN_TELEMETRY_METRICS_SCRAPING_FREQUENCY",
  ]);
  return {
    metricsEnabled: Boolean(envs.OPEN_TELEMETRY_METRICS_ENABLED),
    metricsHost: envs.OPEN_TELEMETRY_METRICS_HOST,
    metricsPort: Number(envs.OPEN_TELEMETRY_METRICS_PORT),
    metricsScrapingFrequency: Number(
      envs.OPEN_TELEMETRY_METRICS_SCRAPING_FREQUENCY
    ),
    tracingEnabled: Boolean(envs.OPEN_TELEMETRY_TRACING_ENABLED),
    tracingUrl: envs.OPEN_TELEMETRY_TRACING_URL,
  };
}
export function parseSettlementEnv(envs: SettlementEnv): {
  network: string;
  graphql: string;
  archive: string;
  accountManager: string;
  sequencerPrivateKey: string;
  settlementContractPrivateKey: string;
  dispatcherContractPrivateKey: string;
  minaBridgeContractPrivateKey: string;
} {
  ensureDefined(envs as Record<string, any>, [
    "MINA_ACCOUNT_MANAGER_HOST",
    "MINA_ACCOUNT_MANAGER_PORT",
    "MINA_ARCHIVE_GRAPHQL_HOST",
    "MINA_ARCHIVE_GRAPHQL_PORT",
    "MINA_NODE_GRAPHQL_HOST",
    "MINA_NODE_GRAPHQL_PORT",
    "MINA_NETWORK",
    "PROTOKIT_SEQUENCER_PRIVATE_KEY",
    "PROTOKIT_SETTLEMENT_CONTRACT_PRIVATE_KEY",
    "PROTOKIT_DISPATCHER_CONTRACT_PRIVATE_KEY",
    "PROTOKIT_MINA_BRIDGE_CONTRACT_PRIVATE_KEY",
  ]);

  return {
    network: envs.MINA_NETWORK!,
    graphql: `${envs.MINA_NODE_GRAPHQL_HOST}:${envs.MINA_NODE_GRAPHQL_PORT}/graphql`,
    archive: `${envs.MINA_ARCHIVE_GRAPHQL_HOST}:${envs.MINA_ARCHIVE_GRAPHQL_PORT}`,
    accountManager: `${envs.MINA_ACCOUNT_MANAGER_HOST}:${envs.MINA_ACCOUNT_MANAGER_PORT}`,
    sequencerPrivateKey: envs.PROTOKIT_SEQUENCER_PRIVATE_KEY!,
    settlementContractPrivateKey:
      envs.PROTOKIT_SETTLEMENT_CONTRACT_PRIVATE_KEY!,
    dispatcherContractPrivateKey:
      envs.PROTOKIT_DISPATCHER_CONTRACT_PRIVATE_KEY!,
    minaBridgeContractPrivateKey:
      envs.PROTOKIT_MINA_BRIDGE_CONTRACT_PRIVATE_KEY!,
  };
}
export function parseIndexerEnv(envs: IndexerEnv): {
  redisHost?: string;
  redisPort?: number;
  redisPassword?: string;
  indexerDatabaseUrl?: string;
  graphqlPort?: number;
  graphqlHost?: string;
  graphiqlEnabled?: boolean;
} {
  ensureDefined(envs as Record<string, any>, [
    "REDIS_HOST",
    "REDIS_PORT",
    "REDIS_PASSWORD",
    "INDEXER_DATABASE_URL",
    "PROTOKIT_INDEXER_GRAPHQL_PORT",
    "PROTOKIT_INDEXER_GRAPHQL_HOST",
    "PROTOKIT_INDEXER_GRAPHIQL_ENABLED",
  ]);
  return {
    redisHost: envs.REDIS_HOST,
    redisPort: envs.REDIS_PORT ? Number(envs.REDIS_PORT) : undefined,
    redisPassword: envs.REDIS_PASSWORD,
    indexerDatabaseUrl: envs.INDEXER_DATABASE_URL,
    graphqlPort: envs.PROTOKIT_INDEXER_GRAPHQL_PORT
      ? Number(envs.PROTOKIT_INDEXER_GRAPHQL_PORT)
      : undefined,
    graphqlHost: envs.PROTOKIT_INDEXER_GRAPHQL_HOST,
    graphiqlEnabled: envs.PROTOKIT_INDEXER_GRAPHIQL_ENABLED
      ? Boolean(envs.PROTOKIT_INDEXER_GRAPHIQL_ENABLED)
      : undefined,
  };
}
export function parseProcessorEnv(envs: ProcessorEnv): {
  processorIndexerGraphqlHost?: string;
  indexerGraphqlPort?: number;
  blockInterval?: number;
  processorGraphqlHost?: string;
  processorGraphqlPort?: number;
  processorGraphiqlEnabled?: boolean;
} {
  ensureDefined(envs as Record<string, any>, [
    "PROTOKIT_PROCESSOR_INDEXER_GRAPHQL_HOST",
    "PROTOKIT_INDEXER_GRAPHQL_PORT",
    "PROTOKIT_BLOCK_INTERVAL",
    "PROTOKIT_PROCESSOR_GRAPHQL_HOST",
    "PROTOKIT_PROCESSOR_GRAPHQL_PORT",
    "PROTOKIT_PROCESSOR_GRAPHIQL_ENABLED",
  ]);
  return {
    processorIndexerGraphqlHost: envs.PROTOKIT_PROCESSOR_INDEXER_GRAPHQL_HOST,
    indexerGraphqlPort: envs.PROTOKIT_INDEXER_GRAPHQL_PORT
      ? Number(envs.PROTOKIT_INDEXER_GRAPHQL_PORT)
      : undefined,
    blockInterval: envs.PROTOKIT_BLOCK_INTERVAL
      ? Number(envs.PROTOKIT_BLOCK_INTERVAL)
      : undefined,
    processorGraphqlHost: envs.PROTOKIT_PROCESSOR_GRAPHQL_HOST,
    processorGraphqlPort: envs.PROTOKIT_PROCESSOR_GRAPHQL_PORT
      ? Number(envs.PROTOKIT_PROCESSOR_GRAPHQL_PORT)
      : undefined,
    processorGraphiqlEnabled: envs.PROTOKIT_PROCESSOR_GRAPHIQL_ENABLED
      ? Boolean(envs.PROTOKIT_PROCESSOR_GRAPHIQL_ENABLED)
      : undefined,
  };
}
export function parseDatabaseEnv(envs: DatabaseEnv): {
  redisHost?: string;
  redisPort?: number;
  redisPassword?: string;
  databaseUrl?: string;
} {
  return {
    redisHost: envs.REDIS_HOST,
    redisPort: envs.REDIS_PORT ? Number(envs.REDIS_PORT) : undefined,
    redisPassword: envs.REDIS_PASSWORD,
    databaseUrl: envs.DATABASE_URL,
  };
}
export function parseTaskQueueEnv(envs: TaskQueueEnv): {
  redisHost?: string;
  redisPort?: number;
  redisPassword?: string;
} {
  return {
    redisHost: envs.REDIS_HOST,
    redisPort: envs.REDIS_PORT ? Number(envs.REDIS_PORT) : undefined,
    redisPassword: envs.REDIS_PASSWORD,
  };
}
export function parseDatabasePruneEnv(envs: DatabasePruneEnv): {
  pruneOnStartup: boolean;
} {
  return {
    pruneOnStartup:
      envs.PRUNE_ON_STARTUP === "true" || envs.PRUNE_ON_STARTUP === true,
  };
}
export function parseGraphqlServerEnv(
  envs: GraphqlServerEnv,
  type: "protokit" | "indexer" | "processor" = "protokit"
): {
  graphqlPort?: number;
  graphqlHost?: string;
  graphiqlEnabled?: boolean;
} {
  const prefix =
    type === "indexer"
      ? "PROTOKIT_INDEXER"
      : type === "processor"
        ? "PROTOKIT_PROCESSOR"
        : "PROTOKIT";
  return {
    graphqlPort: envs[`${prefix}_GRAPHQL_PORT`]
      ? Number(envs[`${prefix}_GRAPHQL_PORT`])
      : undefined,
    graphqlHost: envs[`${prefix}_GRAPHQL_HOST`],
    graphiqlEnabled: envs[`${prefix}_GRAPHIQL_ENABLED`]
      ? Boolean(envs[`${prefix}_GRAPHIQL_ENABLED`])
      : undefined,
  };
}
export function parseRedisEnv(envs: RedisEnv): {
  redisHost?: string;
  redisPort?: number;
  redisPassword?: string;
} {
  return {
    redisHost: envs.REDIS_HOST,
    redisPort: envs.REDIS_PORT ? Number(envs.REDIS_PORT) : undefined,
    redisPassword: envs.REDIS_PASSWORD,
  };
}
