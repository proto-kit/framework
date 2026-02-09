import {
  VanillaGraphqlModules,
  GraphqlSequencerModule,
  GraphqlServer,
  OpenTelemetryServer,
} from "@proto-kit/api";
import {
  PrivateMempool,
  SequencerModulesRecord,
  TimedBlockTrigger,
  BlockProducerModule,
  SequencerStartupModule,
  LocalTaskWorkerModule,
  VanillaTaskWorkerModules,
  MinaBaseLayer,
  ConstantFeeStrategy,
  BatchProducerModule,
  SettlementModule,
  DatabasePruneModule,
  InMemoryDatabase,
  LocalTaskQueue,
  AppChainModulesRecord,
  InMemoryMinaSigner,
  BridgingModule,
} from "@proto-kit/sequencer";
import {
  IndexerNotifier,
  GeneratedResolverFactoryGraphqlModule,
  IndexBlockTask,
  IndexBatchTask,
  IndexPendingTxTask,
  IndexSettlementTask,
} from "@proto-kit/indexer";
import { PrismaRedisDatabase } from "@proto-kit/persistance";
import { BullQueue } from "@proto-kit/deployment";
import {
  TimedProcessorTrigger,
  BlockFetching,
  HandlersExecutor,
  ResolverFactoryGraphqlModule,
  HandlersRecord,
  BasePrismaClient,
} from "@proto-kit/processor";
import {
  BlockStorageNetworkStateModule,
  InMemoryTransactionSender,
  StateServiceQueryModule,
} from "@proto-kit/sdk";
import { PrivateKey } from "o1js";
import { NonEmptyArray } from "type-graphql";
import { ModulesConfig } from "@proto-kit/common";

import {
  buildCustomTokenConfig,
  buildSettlementTokenConfig,
  resolveEnv,
} from "./utils";
import {
  Environment,
  CoreEnv,
  MetricsEnv,
  IndexerEnv,
  ProcessorEnv,
  SettlementEnv,
  RedisEnv,
  DatabaseEnv,
  RedisTaskQueueEnv,
  GraphqlServerEnv,
} from "./types";

export class DefaultModules {
  static api() {
    return {
      GraphqlServer,
      Graphql: GraphqlSequencerModule.from(VanillaGraphqlModules.with({})),
    } satisfies SequencerModulesRecord;
  }

  static core(options?: { settlementEnabled?: boolean }) {
    const settlementEnabled = options?.settlementEnabled ?? false;
    return {
      ...(settlementEnabled ? DefaultModules.settlement() : {}),
      ...DefaultModules.api(),
      Mempool: PrivateMempool,
      BlockProducerModule,
      BlockTrigger: TimedBlockTrigger,
      SequencerStartupModule,
    } satisfies SequencerModulesRecord;
  }

  static metrics() {
    return {
      OpenTelemetryServer,
    } satisfies SequencerModulesRecord;
  }

  static settlement() {
    return {
      BaseLayer: MinaBaseLayer,
      FeeStrategy: ConstantFeeStrategy,
      BatchProducerModule,
      SettlementModule,
      SettlementSigner: InMemoryMinaSigner,
      BridgingModule,
    } satisfies SequencerModulesRecord;
  }

  static sequencerIndexer() {
    return {
      IndexerNotifier,
    } satisfies SequencerModulesRecord;
  }

  static indexer() {
    return {
      Database: PrismaRedisDatabase,
      TaskQueue: BullQueue,
      TaskWorker: LocalTaskWorkerModule.from({
        IndexBlockTask,
        IndexPendingTxTask,
        IndexBatchTask,
        IndexSettlementTask,
      }),
      GraphqlServer,
      Graphql: GraphqlSequencerModule.from({
        GeneratedResolverFactory: GeneratedResolverFactoryGraphqlModule,
      }),
    } satisfies SequencerModulesRecord;
  }

  static processor<PrismaClient extends BasePrismaClient>(
    resolvers: NonEmptyArray<Function>,
    handlers: HandlersRecord<PrismaClient>
  ) {
    return {
      GraphqlServer,
      GraphqlSequencerModule: GraphqlSequencerModule.from({
        ResolverFactory: ResolverFactoryGraphqlModule.from(resolvers),
      }),
      HandlersExecutor: HandlersExecutor.from(handlers),
      BlockFetching,
      Trigger: TimedProcessorTrigger,
    } satisfies SequencerModulesRecord;
  }

  static inMemoryDatabase() {
    return {
      Database: InMemoryDatabase,
    } satisfies SequencerModulesRecord;
  }

  static prismaRedisDatabase() {
    return {
      Database: PrismaRedisDatabase,
      DatabasePruneModule,
    } satisfies SequencerModulesRecord;
  }

  static localWorker(options?: { settlementEnabled?: boolean }) {
    return {
      LocalTaskWorkerModule: LocalTaskWorkerModule.from(
        options?.settlementEnabled === true
          ? VanillaTaskWorkerModules.allTasks()
          : VanillaTaskWorkerModules.withoutSettlement()
      ),
      TaskQueue: LocalTaskQueue,
    } satisfies SequencerModulesRecord;
  }

  static redisTaskQueue() {
    return {
      TaskQueue: BullQueue,
    } satisfies SequencerModulesRecord;
  }

  static remoteWorker() {
    return {
      TaskQueue: BullQueue,
      LocalTaskWorkerModule: LocalTaskWorkerModule.from(
        VanillaTaskWorkerModules.allTasks()
      ),
    } satisfies SequencerModulesRecord;
  }

  static appChainBase() {
    return {
      TransactionSender: InMemoryTransactionSender,
      QueryTransportModule: StateServiceQueryModule,
      NetworkStateTransportModule: BlockStorageNetworkStateModule,
    } satisfies AppChainModulesRecord;
  }

  static settlementScript() {
    return {
      ...DefaultModules.settlement(),
      Mempool: PrivateMempool,
      TaskQueue: LocalTaskQueue,
      SequencerStartupModule,
      BridgingModule: BridgingModule,
    } satisfies SequencerModulesRecord;
  }
}
export class DefaultConfigs {
  static api(options?: {
    preset?: Environment;
    overrides?: Partial<GraphqlServerEnv>;
  }) {
    return {
      Graphql: VanillaGraphqlModules.defaultConfig(),
      ...DefaultConfigs.graphqlServer({
        preset: options?.preset,
        overrides: options?.overrides,
      }),
    };
  }

  static core(options?: {
    preset?: Environment;
    overrides?: Partial<CoreEnv> &
      Partial<GraphqlServerEnv> &
      Partial<SettlementEnv>;
    settlementEnabled?: boolean;
  }) {
    const settlementEnabled = options?.settlementEnabled ?? false;
    const config = resolveEnv<CoreEnv>(options?.preset, options?.overrides);
    const apiConfig = DefaultConfigs.api({
      preset: options?.preset,
      overrides: options?.overrides,
    });
    const settlementConfig = settlementEnabled
      ? DefaultConfigs.settlement({
          preset: options?.preset,
          overrides: options?.overrides,
        })
      : {};
    const blockTriggerConfig = {
      blockInterval: config.blockInterval,
      produceEmptyBlocks: true,
      ...(settlementEnabled
        ? {
            settlementInterval: config.settlementInterval,
            settlementTokenConfig: buildSettlementTokenConfig(
              config.minaBridgeContractPrivateKey!,
              buildCustomTokenConfig(
                config.customTokenPrivateKey,
                config.customTokenBridgePrivateKey
              )
            ),
          }
        : { settlementTokenConfig: {} }),
    };

    return {
      ...apiConfig,
      Mempool: {},
      BlockProducerModule: {},
      BlockTrigger: blockTriggerConfig,
      SequencerStartupModule: {},
      LocalTaskWorkerModule: VanillaTaskWorkerModules.defaultConfig(),
      ...settlementConfig,
    };
  }

  static metrics(options?: {
    preset?: Environment;
    overrides?: Partial<MetricsEnv>;
  }) {
    const config = resolveEnv<MetricsEnv>(options?.preset, options?.overrides);
    return {
      OpenTelemetryServer: {
        metrics: {
          enabled: config.metricsEnabled,
          prometheus: {
            host: config.metricsHost,
            port: config.metricsPort,
            appendTimestamp: true,
          },
          nodeScrapeInterval: config.metricsScrapingFrequency,
        },
        tracing: {
          enabled: config.tracingEnabled,
          otlp: {
            url: config.tracingUrl,
          },
        },
      },
    };
  }

  static sequencerIndexer() {
    return { IndexerNotifier: {} };
  }

  static indexer(options?: {
    preset?: Environment;
    overrides?: Partial<IndexerEnv>;
  }) {
    const config = resolveEnv(options?.preset, options?.overrides);
    const taskQueueConfig = DefaultConfigs.redisTaskQueue({
      preset: options?.preset,
      overrides: options?.overrides,
    });
    const databaseConfig = DefaultConfigs.prismaRedisDatabase({
      preset: options?.preset,
      overrides: {
        databaseUrl: config.indexerDatabaseUrl,
        ...options?.overrides,
      },
    });
    const graphqlServerConfig = DefaultConfigs.graphqlServer({
      preset: options?.preset,
      overrides: {
        graphqlHost: config.indexerGraphqlHost,
        graphqlPort: config.indexerGraphqlPort,
        graphiqlEnabled: config.indexerGraphqlEnabled,
        ...options?.overrides,
      },
    });

    return {
      ...databaseConfig,
      ...taskQueueConfig,
      TaskWorker: {
        IndexBlockTask: {},
        IndexBatchTask: {},
        IndexPendingTxTask: {},
        IndexSettlementTask: {},
      },
      ...graphqlServerConfig,
      Graphql: {
        GeneratedResolverFactory: {},
      },
    };
  }

  static processor(options?: {
    preset?: Environment;
    overrides?: Partial<ProcessorEnv>;
  }) {
    const config = resolveEnv<ProcessorEnv>(
      options?.preset,
      options?.overrides
    );
    const graphqlServerConfig = DefaultConfigs.graphqlServer({
      preset: options?.preset,
      overrides: {
        graphqlHost: config.processorGraphqlHost,
        graphqlPort: config.processorGraphqlPort,
        graphiqlEnabled: config.processorGraphqlEnabled,
        ...options?.overrides,
      },
    });
    return {
      HandlersExecutor: {},
      BlockFetching: {
        url: `http://${config.processorIndexerGraphqlHost}:${config.indexerGraphqlPort}`,
      },
      Trigger: {
        interval: Number(config.blockInterval) / 5,
      },
      ...graphqlServerConfig,
      GraphqlSequencerModule: {
        ResolverFactory: {},
      },
    };
  }

  static settlement(options?: {
    preset?: Environment;
    overrides?: Partial<SettlementEnv>;
  }) {
    const config = resolveEnv<SettlementEnv>(
      options?.preset,
      options?.overrides
    );

    return {
      BaseLayer: {
        network: {
          type: "lightnet" as const,
          graphql: `${config.minaNodeGraphqlHost}:${config.minaNodeGraphqlPort}/graphql`,
          archive: `${config.minaArchiveGraphqlHost}:${config.minaArchiveGraphqlPort}/graphql`,
          accountManager: `${config.minaAccountManagerHost}:${config.minaAccountManagerPort}`,
        },
      },
      SettlementModule: {
        addresses: {
          SettlementContract: PrivateKey.fromBase58(
            config.settlementContractPrivateKey
          ).toPublicKey(),
        },
      },
      BridgingModule: {
        addresses: {
          DispatchContract: PrivateKey.fromBase58(
            config.dispatcherContractPrivateKey
          ).toPublicKey(),
        },
      },
      SettlementSigner: {
        feepayer: PrivateKey.fromBase58(config.sequencerPrivateKey),
        contractKeys: [
          PrivateKey.fromBase58(config.settlementContractPrivateKey),
          PrivateKey.fromBase58(config.dispatcherContractPrivateKey),
          PrivateKey.fromBase58(config.minaBridgeContractPrivateKey),
        ],
      },
      FeeStrategy: {},
      BatchProducerModule: {},
      LocalTaskWorkerModule: VanillaTaskWorkerModules.defaultConfig(),
    };
  }

  static inMemoryDatabase() {
    return { Database: {} };
  }

  static prismaRedisDatabase(options?: {
    preset?: Environment;
    overrides?: Partial<DatabaseEnv>;
  }) {
    const preset = options?.preset ?? "development";
    const config = resolveEnv<DatabaseEnv>(preset, options?.overrides);
    const redisConfig = DefaultConfigs.redis({
      preset,
      overrides: options?.overrides,
    });
    return {
      Database: {
        ...redisConfig,
        prisma: {
          connection: config.databaseUrl,
        },
      },
      DatabasePruneModule: {
        pruneOnStartup: config.pruneOnStartup,
      },
    };
  }

  static localWorker() {
    return {
      TaskQueue: {},
      LocalTaskWorkerModule: {
        ...VanillaTaskWorkerModules.defaultConfig(),
      },
    } satisfies ModulesConfig<ReturnType<typeof DefaultModules.localWorker>>;
  }

  static redisTaskQueue(options?: {
    preset?: Environment;
    overrides?: Partial<RedisTaskQueueEnv>;
  }) {
    const config = resolveEnv<RedisTaskQueueEnv>(
      options?.preset,
      options?.overrides
    );

    return {
      TaskQueue: {
        redis: {
          host: config.redisHost,
          port: config.redisPort,
          password: config.redisPassword,
          db: config.redisDb,
        },
        retryAttempts: config.retryAttempts,
      },
    };
  }

  static graphqlServer(options?: {
    preset?: Environment;
    overrides?: Partial<GraphqlServerEnv>;
  }) {
    const config = resolveEnv<GraphqlServerEnv>(
      options?.preset,
      options?.overrides
    );

    return {
      GraphqlServer: {
        port: config.graphqlPort,
        host: config.graphqlHost,
        graphiql: config.graphiqlEnabled,
      },
    };
  }

  static redis(options?: {
    preset?: Environment;
    overrides?: Partial<RedisEnv>;
  }) {
    const config = resolveEnv<RedisEnv>(options?.preset, options?.overrides);

    return {
      redis: {
        host: config.redisHost,
        port: config.redisPort,
        password: config.redisPassword,
      },
    };
  }

  static appChainBase() {
    return {
      QueryTransportModule: {},
      NetworkStateTransportModule: {},
      TransactionSender: {},
    };
  }

  static worker(options?: {
    preset?: Environment;
    overrides?: Partial<RedisTaskQueueEnv>;
  }) {
    const taskQueueConfig = DefaultConfigs.redisTaskQueue({
      preset: options?.preset,
      overrides: options?.overrides,
    });

    return {
      ...taskQueueConfig,
      LocalTaskWorkerModule: VanillaTaskWorkerModules.defaultConfig(),
    };
  }

  static settlementScript(options?: {
    preset?: Environment;
    overrides?: Partial<SettlementEnv>;
  }) {
    const settlementConfig = DefaultConfigs.settlement({
      preset: options?.preset,
      overrides: options?.overrides,
    });
    return {
      ...settlementConfig,
      SequencerStartupModule: {},
      TaskQueue: {
        simulatedDuration: 0,
      },
      Mempool: {},
      BridgingModule: {},
    };
  }
}
