export const inmemoryConfig = {
  blockInterval: 5000,
  graphqlHost: "localhost",
  graphqlPort: 8080,
  graphiqlEnabled: true,
};
export const developmentConfig = {
  proofsEnabled: false,

  shouldAttemptDbMigration: true,
  shouldAttemptIndexerDbMigration: true,
  shouldAttemptProcessorDbMigration: true,

  pruneOnStartup: false,

  blockInterval: 30000,
  settlementInterval: 60000,
  settlementEnabled: true,

  redisHost: "localhost",
  redisPort: 6379,
  redisPassword: "password",

  databaseUrl:
    "postgresql://admin:password@localhost:5432/protokit?schema=public",

  indexerDatabaseUrl:
    "postgresql://admin:password@localhost:5433/protokit-indexer?schema=public",

  processorDatabaseUrl:
    "postgresql://admin:password@localhost:5434/protokit-processor?schema=public",

  graphqlHost: "0.0.0.0",
  graphqlPort: 8080,
  graphiqlEnabled: true,

  indexerGraphqlHost: "0.0.0.0",
  indexerGraphqlPort: 8081,
  indexerGraphqlEnabled: true,

  processorGraphqlHost: "0.0.0.0",
  processorGraphqlPort: 8082,
  processorGraphqlEnabled: true,

  processorIndexerGraphqlHost: "0.0.0.0",

  minaNetwork: "lightnet",
  minaNodeGraphqlHost: "http://localhost",
  minaNodeGraphqlPort: 8083,

  minaArchiveGraphqlHost: "http://localhost",
  minaArchiveGraphqlPort: 8085,

  minaAccountManagerHost: "http://localhost",
  minaAccountManagerPort: 8084,
  minaExplorerPort: 3001,

  transactionFeeRecipientPrivateKey:
    "EKEssvj33MMBCg2tcybTzL32nTKbbwFHm6yUxd3JassdhL3J5aT8",
  transactionFeeRecipientPublicKey:
    "B62qk4sNnzZqqjHp8YQXZUV3dBpnjiNieJVnsuh7mD2bMJ9PdbskH5H",

  sequencerPrivateKey: "EKEdKhgUHMuDvwWJEg2TdCMCeiTSd9hh2HrEr6uYJfPVuwur1s43",
  sequencerPublicKey: "B62qizW6aroTxQorJz4ywVNZom4jA6W4QPPCK3wLeyhnJHtVStUNniL",

  settlementContractPrivateKey:
    "EKErS9gYHZNawqKuwfMiwYYJtNptCrvca491QEvB3tz8sFsS5w66",
  settlementContractPublicKey:
    "B62qjKhzrvDgTPXCp34ozmpFSx4sC9owZe6eDzhdGPdoiUbGPmBkHTt",

  dispatcherContractPrivateKey:
    "EKF9Ei5G9PeB5ULMh9R6P5LfWX2gs15XxPNsect1pbcbMY9vs6v7",
  dispatcherContractPublicKey:
    "B62qmAzUJ1jqcsEf2V3K1k2Ec4MLsEKnodEvvJ5uweTFSLYEUALe1zs",

  minaBridgeContractPrivateKey:
    "EKFKTGqWU2egLKhMgoxX8mQ21zXSE1RZYkY82mmK9F3BxdSA7E5M",
  minaBridgeContractPublicKey:
    "B62qn8XRkWcaBvv6F7kvarKs4cViaKRMbTUHT8FrDXLnvxuV6n7CHsN",

  customTokenPrivateKey: "EKFZHQSo5YdrcU7neDaNZruYHvCiNncvdZyKXuS6MDCW1fyCFKDP",

  customTokenAdminPrivateKey:
    "EKENQ2QRc4gAJkZjQXU86ZS9MDm1e7HFiNN6LgRJnniHJt1WXDn1",

  customTokenBridgePrivateKey:
    "EKENQ2QRc4gAJkZjQXU86ZS9MDm1e7HFiNN6LgRJnniHJt1WXDn1",

  testAccount1PrivateKey:
    "EKF5p3wQTFd4tRBiGicRf93yXK82bcRryokC1qoazRM6wq6gMzWJ",
  testAccount1PublicKey:
    "B62qkVfEwyfkm5yucHEqrRjxbyx98pgdWz82pHv7LYq9Qigs812iWZ8",

  openTelemetryTracingEnabled: true,
  openTelemetryTracingUrl: "http://localhost:4318",

  openTelemetryMetricsEnabled: true,
  openTelemetryMetricsHost: "0.0.0.0",
  openTelemetryMetricsPort: 4320,
  openTelemetryMetricsScrapingFrequency: 10,
};
export const sovereignConfig = {
  blockInterval: 10000,
  settlementInterval: 30000,
  settlementEnabled: true,

  shouldAttemptDbMigration: true,
  shouldAttemptIndexerDbMigration: true,
  shouldAttemptProcessorDbMigration: true,

  pruneOnStartup: false,

  redisHost: "redis",
  redisPort: 6379,
  redisPassword: "password",

  databaseUrl:
    "postgresql://admin:password@postgres:5432/protokit?schema=public",

  indexerDatabaseUrl:
    "postgresql://admin:password@indexer-postgres:5432/protokit-indexer?schema=public",

  processorDatabaseUrl:
    "postgresql://admin:password@processor-postgres:5432/protokit-processor?schema=public",

  graphqlHost: "0.0.0.0",
  graphqlPort: 8080,
  graphiqlEnabled: true,

  indexerGraphqlHost: "0.0.0.0",
  indexerGraphqlPort: 8081,
  indexerGraphqlEnabled: true,

  processorGraphqlHost: "0.0.0.0",
  processorGraphqlPort: 8082,
  processorGraphqlEnabled: true,
  processorIndexerGraphqlHost: "indexer",

  minaNetwork: "lightnet",
  minaNodeGraphqlHost: "http://lightnet",
  minaNodeGraphqlPort: 8080,

  minaArchiveGraphqlHost: "http://lightnet",
  minaArchiveGraphqlPort: 8282,

  minaAccountManagerHost: "http://lightnet",
  minaAccountManagerPort: 8084,
  minaExplorerPort: 3001,
  transactionFeeRecipientPrivateKey:
    "EKEssvj33MMBCg2tcybTzL32nTKbbwFHm6yUxd3JassdhL3J5aT8",
  transactionFeeRecipientPublicKey:
    "B62qk4sNnzZqqjHp8YQXZUV3dBpnjiNieJVnsuh7mD2bMJ9PdbskH5H",

  sequencerPrivateKey: "EKEdKhgUHMuDvwWJEg2TdCMCeiTSd9hh2HrEr6uYJfPVuwur1s43",
  sequencerPublicKey: "B62qizW6aroTxQorJz4ywVNZom4jA6W4QPPCK3wLeyhnJHtVStUNniL",

  settlementContractPrivateKey:
    "EKErS9gYHZNawqKuwfMiwYYJtNptCrvca491QEvB3tz8sFsS5w66",
  settlementContractPublicKey:
    "B62qjKhzrvDgTPXCp34ozmpFSx4sC9owZe6eDzhdGPdoiUbGPmBkHTt",

  dispatcherContractPrivateKey:
    "EKF9Ei5G9PeB5ULMh9R6P5LfWX2gs15XxPNsect1pbcbMY9vs6v7",
  dispatcherContractPublicKey:
    "B62qmAzUJ1jqcsEf2V3K1k2Ec4MLsEKnodEvvJ5uweTFSLYEUALe1zs",

  minaBridgeContractPrivateKey:
    "EKFKTGqWU2egLKhMgoxX8mQ21zXSE1RZYkY82mmK9F3BxdSA7E5M",
  minaBridgeContractPublicKey:
    "B62qn8XRkWcaBvv6F7kvarKs4cViaKRMbTUHT8FrDXLnvxuV6n7CHsN",

  testAccount1PrivateKey:
    "EKF5p3wQTFd4tRBiGicRf93yXK82bcRryokC1qoazRM6wq6gMzWJ",
  testAccount1PublicKey:
    "B62qkVfEwyfkm5yucHEqrRjxbyx98pgdWz82pHv7LYq9Qigs812iWZ8",

  openTelemetryTracingEnabled: true,
  openTelemetryTracingUrl: "http://otel-collector:4317",

  openTelemetryMetricsEnabled: true,
  openTelemetryMetricsHost: "0.0.0.0",
  openTelemetryMetricsPort: 4320,
  openTelemetryMetricsScrapingFrequency: 10,
};
