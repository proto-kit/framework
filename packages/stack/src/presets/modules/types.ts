import { RecursivePartial, ModulesConfig } from "@proto-kit/common";
import { SequencerModulesRecord } from "@proto-kit/sequencer";

export type ModuleOverrides = Partial<SequencerModulesRecord>;
export type ConfigOverrides = RecursivePartial<ModulesConfig<any>>;
export type Environment = "inmemory" | "development" | "sovereign";
export type ApiEnv = {
  PROTOKIT_GRAPHQL_PORT: number | string;
  PROTOKIT_GRAPHQL_HOST: string;
  PROTOKIT_GRAPHIQL_ENABLED: boolean | string;
};
export type CoreEnv = {
  PROTOKIT_BLOCK_INTERVAL: number | string;
  PROTOKIT_SETTLEMENT_INTERVAL?: number | string;
  PROTOKIT_MINA_BRIDGE_CONTRACT_PRIVATE_KEY?: string;
  PROTOKIT_CUSTOM_TOKEN_PRIVATE_KEY?: string;
  PROTOKIT_CUSTOM_TOKEN_BRIDGE_PRIVATE_KEY?: string;
};
export type MetricsEnv = {
  OPEN_TELEMETRY_METRICS_ENABLED: boolean | string;
  OPEN_TELEMETRY_METRICS_HOST: string;
  OPEN_TELEMETRY_METRICS_PORT: number | string;
  OPEN_TELEMETRY_METRICS_SCRAPING_FREQUENCY: number | string;
  OPEN_TELEMETRY_TRACING_ENABLED: boolean | string;
  OPEN_TELEMETRY_TRACING_URL: string;
};
export type SettlementEnv = {
  MINA_NETWORK: string;
  MINA_NODE_GRAPHQL_HOST: string;
  MINA_NODE_GRAPHQL_PORT: number | string;
  MINA_ARCHIVE_GRAPHQL_HOST: string;
  MINA_ARCHIVE_GRAPHQL_PORT: number | string;
  MINA_ACCOUNT_MANAGER_HOST: string;
  MINA_ACCOUNT_MANAGER_PORT: number | string;
  PROTOKIT_SEQUENCER_PRIVATE_KEY: string;
  PROTOKIT_SETTLEMENT_CONTRACT_PRIVATE_KEY: string;
  PROTOKIT_DISPATCHER_CONTRACT_PRIVATE_KEY: string;
  PROTOKIT_MINA_BRIDGE_CONTRACT_PRIVATE_KEY: string;
};
export type IndexerEnv = {
  REDIS_HOST: string;
  REDIS_PORT: number | string;
  REDIS_PASSWORD: string;
  INDEXER_DATABASE_URL: string;
  PROTOKIT_INDEXER_GRAPHQL_PORT: number | string;
  PROTOKIT_INDEXER_GRAPHQL_HOST: string;
  PROTOKIT_INDEXER_GRAPHIQL_ENABLED: boolean | string;
};
export type ProcessorEnv = {
  PROTOKIT_PROCESSOR_INDEXER_GRAPHQL_HOST: string;
  PROTOKIT_INDEXER_GRAPHQL_PORT: number | string;
  PROTOKIT_BLOCK_INTERVAL: number | string;
  PROTOKIT_PROCESSOR_GRAPHQL_HOST: string;
  PROTOKIT_PROCESSOR_GRAPHQL_PORT: number | string;
  PROTOKIT_PROCESSOR_GRAPHIQL_ENABLED: boolean | string;
};
export type DatabaseEnv = {
  REDIS_HOST: string;
  REDIS_PORT: number | string;
  REDIS_PASSWORD: string;
  DATABASE_URL: string;
};
export type TaskQueueEnv = {
  REDIS_HOST: string;
  REDIS_PORT: number | string;
  REDIS_PASSWORD: string;
};
export type DatabasePruneEnv = {
  PRUNE_ON_STARTUP?: boolean | string;
};
export type GraphqlServerEnv = {
  PROTOKIT_GRAPHQL_PORT?: number | string;
  PROTOKIT_GRAPHQL_HOST?: string;
  PROTOKIT_GRAPHIQL_ENABLED?: boolean | string;
  PROTOKIT_INDEXER_GRAPHQL_HOST?: string;
  PROTOKIT_INDEXER_GRAPHQL_PORT?: number | string;
  PROTOKIT_INDEXER_GRAPHIQL_ENABLED?: boolean | string;
  PROTOKIT_PROCESSOR_GRAPHQL_HOST?: string;
  PROTOKIT_PROCESSOR_GRAPHQL_PORT?: number | string;
  PROTOKIT_PROCESSOR_GRAPHIQL_ENABLED?: boolean | string;
};
export type RedisEnv = {
  REDIS_HOST: string;
  REDIS_PORT: number | string;
  REDIS_PASSWORD: string;
};
