export type Environment = "inmemory" | "development" | "sovereign";

export type GraphqlServerEnv = {
  graphqlPort: number;
  graphqlHost: string;
  graphiqlEnabled: boolean;
};
export type CoreEnv = {
  blockInterval: number;
  settlementInterval?: number;
  minaBridgeContractPrivateKey?: string;
  customTokenPrivateKey?: string;
  customTokenBridgePrivateKey?: string;
};
export type MetricsEnv = {
  metricsEnabled: boolean;
  metricsHost: string;
  metricsPort: number;
  metricsScrapingFrequency: number;
  tracingEnabled: boolean;
  tracingUrl: string;
};
export type SettlementEnv = {
  minaNetwork: string;
  minaNodeGraphqlHost: string;
  minaNodeGraphqlPort: number;
  minaArchiveGraphqlHost: string;
  minaArchiveGraphqlPort: number;
  minaAccountManagerHost: string;
  minaAccountManagerPort: number;
  sequencerPrivateKey: string;
  settlementContractPrivateKey: string;
  dispatcherContractPrivateKey: string;
  minaBridgeContractPrivateKey: string;
};
export type IndexerEnv = RedisTaskQueueEnv & {
  indexerDatabaseUrl: string;
  indexerGraphqlHost: string;
  indexerGraphqlPort: number;
  indexerGraphqlEnabled: boolean;
  pruneOnStartup?: boolean;
};
export type ProcessorEnv = {
  processorIndexerGraphqlHost: string;
  indexerGraphqlPort: number;
  blockInterval: number;
  processorGraphqlHost: string;
  processorGraphqlPort: number;
  processorGraphqlEnabled: boolean;
};
export type DatabaseEnv = RedisEnv & {
  databaseUrl: string;
  pruneOnStartup?: boolean;
};
export type RedisEnv = {
  redisHost: string;
  redisPort: number;
  redisPassword: string;
};
export type RedisTaskQueueEnv = RedisEnv & {
  redisDb?: number;
  retryAttempts?: number;
};
