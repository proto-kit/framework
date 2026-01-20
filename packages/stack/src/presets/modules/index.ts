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
} from "@proto-kit/sequencer";
import {
  IndexerNotifier,
  GeneratedResolverFactoryGraphqlModule,
  IndexBlockTask,
} from "@proto-kit/indexer";
import { PrivateKey } from "o1js";
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
import { AppChainModulesRecord } from "@proto-kit/sequencer";
import {
  buildCustomTokenConfig,
  buildSettlementTokenConfig,
  definePreset,
  orderModulesByDependencies,
  parseApiEnv,
  parseCoreEnv,
  parseMetricsEnv,
  parseSettlementEnv,
  parseIndexerEnv,
  parseProcessorEnv,
  parseDatabaseEnv,
  parseDatabasePruneEnv,
  parseGraphqlServerEnv,
  parseRedisEnv,
  resolveEnv,
} from "./utils";
import { NonEmptyArray } from "type-graphql";
import {
  Environment,
  ModuleOverrides,
  ApiEnv,
  ConfigOverrides,
  CoreEnv,
  MetricsEnv,
  IndexerEnv,
  ProcessorEnv,
  SettlementEnv,
  DatabaseEnv,
  TaskQueueEnv,
  DatabasePruneEnv,
  GraphqlServerEnv,
  RedisEnv,
} from "./types";

export class DefaultModules {
  static api(options?: {
    overrides?: ModuleOverrides;
  }): SequencerModulesRecord {
    return definePreset(
      {
        GraphqlServer,
        Graphql: GraphqlSequencerModule.from(VanillaGraphqlModules.with({})),
      },
      options?.overrides
    );
  }
  static core(options?: {
    overrides?: ModuleOverrides;
    settlementEnabled?: boolean;
  }): SequencerModulesRecord {
    return definePreset(
      {
        ...DefaultModules.api(),
        Mempool: PrivateMempool,
        BlockProducerModule,
        BlockTrigger: TimedBlockTrigger,
        SequencerStartupModule,
        LocalTaskWorkerModule: LocalTaskWorkerModule.from(
          VanillaTaskWorkerModules.withoutSettlement()
        ),
        ...(options?.settlementEnabled ? DefaultModules.settlement() : {}),
      },
      options?.overrides
    );
  }
  static metrics(options?: {
    overrides?: ModuleOverrides;
  }): SequencerModulesRecord {
    return definePreset(
      {
        OpenTelemetryServer,
      },
      options?.overrides
    );
  }
  static settlement(options?: {
    overrides?: ModuleOverrides;
  }): SequencerModulesRecord {
    return definePreset(
      {
        BaseLayer: MinaBaseLayer,
        FeeStrategy: ConstantFeeStrategy,
        BatchProducerModule,
        SettlementModule,
        LocalTaskWorkerModule: LocalTaskWorkerModule.from(
          VanillaTaskWorkerModules.allTasks()
        ),
      },
      options?.overrides
    );
  }
  static sequencerIndexer(options?: {
    overrides?: ModuleOverrides;
  }): SequencerModulesRecord {
    return definePreset(
      {
        IndexerNotifier,
      },
      options?.overrides
    );
  }
  static indexer(options?: { overrides?: ModuleOverrides }) {
    return definePreset(
      {
        Database: PrismaRedisDatabase,
        TaskQueue: BullQueue,
        TaskWorker: LocalTaskWorkerModule.from({
          IndexBlockTask,
        }),
        GraphqlServer,
        Graphql: GraphqlSequencerModule.from({
          GeneratedResolverFactory: GeneratedResolverFactoryGraphqlModule,
        }),
      },
      options?.overrides
    );
  }
  static processor<PrismaClient extends BasePrismaClient>(
    resolvers: NonEmptyArray<Function>,
    handlers: HandlersRecord<PrismaClient>,
    options?: { overrides?: ModuleOverrides }
  ) {
    return definePreset(
      {
        GraphqlServer,
        GraphqlSequencerModule: GraphqlSequencerModule.from({
          ResolverFactory: ResolverFactoryGraphqlModule.from(resolvers),
        }),
        HandlersExecutor: HandlersExecutor.from(handlers),
        BlockFetching,
        Trigger: TimedProcessorTrigger,
      },
      options?.overrides
    );
  }
  static database(options?: {
    overrides?: ModuleOverrides;
    preset?: Environment;
  }): SequencerModulesRecord {
    const preset = options?.preset ?? "inmemory";

    return definePreset(
      {
        Database:
          preset === "inmemory" ? InMemoryDatabase : PrismaRedisDatabase,
      },
      options?.overrides
    );
  }
  static taskQueue(options?: {
    overrides?: ModuleOverrides;
    preset?: Environment;
  }): SequencerModulesRecord {
    const preset = options?.preset ?? "inmemory";
    return definePreset(
      {
        TaskQueue: preset === "inmemory" ? LocalTaskQueue : BullQueue,
      },
      options?.overrides
    );
  }
  static databasePrune(options?: {
    overrides?: ModuleOverrides;
  }): SequencerModulesRecord {
    return definePreset(
      {
        DatabasePruneModule,
      },
      options?.overrides
    );
  }
  static worker(options?: {
    overrides?: ModuleOverrides;
  }): SequencerModulesRecord {
    return definePreset(
      {
        TaskQueue: BullQueue,
        LocalTaskWorkerModule: LocalTaskWorkerModule.from(
          VanillaTaskWorkerModules.allTasks()
        ),
      },
      options?.overrides
    );
  }
  static appChainBase(options?: {
    overrides?: Partial<AppChainModulesRecord>;
  }): AppChainModulesRecord {
    return definePreset(
      {
        TransactionSender: InMemoryTransactionSender,
        QueryTransportModule: StateServiceQueryModule,
        NetworkStateTransportModule: BlockStorageNetworkStateModule,
      },
      options?.overrides
    ) as AppChainModulesRecord;
  }
  static settlementScript(options?: {
    overrides?: ModuleOverrides;
  }): SequencerModulesRecord {
    return definePreset(
      {
        ...DefaultModules.settlement(),
        Mempool: PrivateMempool,
        TaskQueue: LocalTaskQueue,
        SequencerStartupModule,
      },
      options?.overrides
    );
  }
  static ordered(modules: any) {
    return orderModulesByDependencies(modules);
  }
}
export class DefaultConfigs {
  static api(options?: {
    preset?: Environment;
    envs?: Partial<ApiEnv>;
    overrides?: ConfigOverrides;
  }): ConfigOverrides {
    return definePreset(
      {
        Graphql: VanillaGraphqlModules.defaultConfig(),
        GraphqlServer: DefaultConfigs.graphqlServer({
          type: "protokit",
          preset: options?.preset,
          envs: options?.envs,
        }),
      },
      options?.overrides
    );
  }
  static core(options?: {
    preset?: Environment;
    envs?: Partial<CoreEnv> & Partial<ApiEnv> & Partial<SettlementEnv>;
    overrides?: ConfigOverrides;
    settlementEnabled?: boolean;
  }): ConfigOverrides {
    const config = resolveEnv<CoreEnv>(options?.preset, options?.envs);
    const parsed = parseCoreEnv(
      { ...config, ...options?.envs },
      options?.settlementEnabled
    );
    const apiConfig = DefaultConfigs.api({
      preset: options?.preset,
      envs: options?.envs,
    });
    const settlementConfig = options?.settlementEnabled
      ? DefaultConfigs.settlement({
          preset: options?.preset,
          envs: options?.envs,
        })
      : {};
    const blockTriggerConfig = {
      blockInterval: parsed.blockInterval,
      produceEmptyBlocks: true,
      ...(options?.settlementEnabled
        ? {
            settlementInterval: parsed.settlementInterval,
            settlementTokenConfig: buildSettlementTokenConfig(
              parsed.minaBridgeKey!,
              buildCustomTokenConfig(
                parsed.customTokenKey,
                parsed.customTokenBridgeKey
              )
            ),
          }
        : { settlementTokenConfig: {} }),
    };

    return definePreset(
      {
        ...apiConfig,
        Mempool: {},
        BlockProducerModule: {},
        BlockTrigger: blockTriggerConfig,
        SequencerStartupModule: {},
        LocalTaskWorkerModule: VanillaGraphqlModules.defaultConfig(),
        ...settlementConfig,
      },
      options?.overrides
    );
  }
  static metrics(options?: {
    preset?: Environment;
    envs?: MetricsEnv;
    overrides?: ConfigOverrides;
  }): ConfigOverrides {
    const configs = resolveEnv<MetricsEnv>(options?.preset, options?.envs);
    const parsed = parseMetricsEnv(configs);
    return definePreset(
      {
        OpenTelemetryServer: {
          metrics: {
            enabled: parsed.metricsEnabled,
            prometheus: {
              host: parsed.metricsHost,
              port: parsed.metricsPort,
              appendTimestamp: true,
            },
            nodeScrapeInterval: parsed.metricsScrapingFrequency,
          },
          tracing: {
            enabled: parsed.tracingEnabled,
            otlp: {
              url: parsed.tracingUrl,
            },
          },
        },
      },
      options?.overrides
    );
  }
  static sequencerIndexer(options?: {
    overrides?: ConfigOverrides;
  }): ConfigOverrides {
    return definePreset({ IndexerNotifier: {} }, options?.overrides);
  }
  static indexer(options?: {
    preset?: Environment;
    envs?: Partial<IndexerEnv>;
    overrides?: ConfigOverrides;
  }): ConfigOverrides {
    const config = resolveEnv<IndexerEnv>(options?.preset, options?.envs);
    const parsed = parseIndexerEnv(config);
    const redisConfig = DefaultConfigs.redis({
      preset: options?.preset,
      envs: options?.envs,
    });
    const databaseConfig = DefaultConfigs.database({
      preset: options?.preset,
      envs: options?.envs,
    });
    const graphqlServerConfig = DefaultConfigs.graphqlServer({
      type: "indexer",
      preset: options?.preset,
      envs: options?.envs,
    });

    return definePreset(
      {
        ...databaseConfig,
        TaskQueue: redisConfig.TaskQueue,
        TaskWorker: {
          IndexBlockTask: {},
        },
        ...graphqlServerConfig,
        Graphql: {
          GeneratedResolverFactory: {},
        },
      },
      options?.overrides
    );
  }
  static processor(options?: {
    preset?: Environment;
    envs?: Partial<ProcessorEnv>;
    overrides?: ConfigOverrides;
  }): ConfigOverrides {
    const config = resolveEnv<ProcessorEnv>(options?.preset, options?.envs);
    const parsed = parseProcessorEnv(config);
    const graphqlServerConfig = DefaultConfigs.graphqlServer({
      type: "processor",
      preset: options?.preset,
      envs: options?.envs,
    });
    return definePreset(
      {
        HandlersExecutor: {},
        BlockFetching: {
          url: `http://${parsed.processorIndexerGraphqlHost}:${parsed.indexerGraphqlPort}`,
        },
        Trigger: {
          interval: (parsed.blockInterval ?? 5000) / 5,
        },
        ...graphqlServerConfig,
        GraphqlSequencerModule: {
          ResolverFactory: {},
        },
      },
      options?.overrides
    );
  }
  static settlement(options?: {
    preset?: Environment;
    envs?: Partial<SettlementEnv>;
    overrides?: ConfigOverrides;
  }): ConfigOverrides {
    const config = resolveEnv<SettlementEnv>(options?.preset, options?.envs);
    const parsed = parseSettlementEnv(config);

    return definePreset(
      {
        BaseLayer: {
          network: {
            type: parsed.network,
            graphql: parsed.graphql,
            archive: parsed.archive,
            accountManager: parsed.accountManager,
          },
        },
        SettlementModule: {
          feepayer: PrivateKey.fromBase58(parsed.sequencerPrivateKey),
          keys: {
            settlement: PrivateKey.fromBase58(
              parsed.settlementContractPrivateKey
            ),
            dispatch: PrivateKey.fromBase58(
              parsed.dispatcherContractPrivateKey
            ),
            minaBridge: PrivateKey.fromBase58(
              parsed.minaBridgeContractPrivateKey
            ),
          },
        },
        FeeStrategy: {},
        BatchProducerModule: {},
      },
      options?.overrides
    );
  }
  static database(options?: {
    preset?: Environment;
    envs?: Partial<DatabaseEnv>;
    overrides?: ConfigOverrides;
  }): ConfigOverrides {
    const preset = options?.preset ?? "inmemory";
    if (preset === "inmemory") {
      return { Database: definePreset({}, options?.overrides) };
    }
    const config = resolveEnv<DatabaseEnv>(options?.preset, options?.envs);
    const parsed = parseDatabaseEnv(config);
    const redisConfig = DefaultConfigs.redis({
      preset: options?.preset,
      envs: options?.envs,
    });
    return {
      Database: definePreset(
        {
          ...redisConfig,
          prisma: {
            connection: parsed.databaseUrl,
          },
        },
        options?.overrides
      ),
    };
  }
  static taskQueue(options?: {
    preset?: Environment;
    envs?: Partial<TaskQueueEnv>;
    overrides?: ConfigOverrides;
  }): ConfigOverrides {
    const preset = options?.preset ?? "inmemory";
    if (preset === "inmemory") {
      return {
        TaskQueue: definePreset({}, options?.overrides),
      };
    }
    const redisConfig = DefaultConfigs.redis({
      preset: options?.preset,
      envs: options?.envs,
    });

    return { TaskQueue: definePreset(redisConfig, options?.overrides) };
  }
  static databasePrune(options?: {
    preset?: Environment;
    envs?: Partial<DatabasePruneEnv>;
    overrides?: ConfigOverrides;
  }): ConfigOverrides {
    const config = resolveEnv<DatabasePruneEnv>(options?.preset, options?.envs);
    const parsed = parseDatabasePruneEnv(config);

    return {
      DatabasePruneModule: definePreset(
        {
          pruneOnStartup: parsed.pruneOnStartup,
        },
        options?.overrides
      ),
    };
  }
  static graphqlServer(options?: {
    preset?: Environment;
    envs?: Partial<GraphqlServerEnv>;
    overrides?: ConfigOverrides;
    type?: "indexer" | "processor" | "protokit";
  }): ConfigOverrides {
    const config = resolveEnv<GraphqlServerEnv>(options?.preset, options?.envs);
    const parsed = parseGraphqlServerEnv(config, options?.type);

    return definePreset(
      {
        port: parsed.graphqlPort,
        host: parsed.graphqlHost,
        graphiql: parsed.graphiqlEnabled,
      },
      options?.overrides
    );
  }
  static redis(options?: {
    preset?: Environment;
    envs?: Partial<RedisEnv>;
    overrides?: ConfigOverrides;
  }): ConfigOverrides {
    const config = resolveEnv<RedisEnv>(options?.preset, options?.envs);
    const parsed = parseRedisEnv(config);

    return {
      redis: definePreset(
        {
          host: parsed.redisHost,
          port: parsed.redisPort,
          password: parsed.redisPassword,
        },
        options?.overrides
      ),
    };
  }
  static appChainBase(options?: {
    overrides?: ConfigOverrides;
  }): ConfigOverrides {
    return definePreset(
      {
        QueryTransportModule: {},
        NetworkStateTransportModule: {},
        TransactionSender: {},
      },
      options?.overrides
    );
  }
  static worker(options?: {
    preset?: Environment;
    envs?: Partial<RedisEnv>;
    overrides?: ConfigOverrides;
  }): ConfigOverrides {
    const redisConfig = DefaultConfigs.redis({
      preset: options?.preset,
      envs: options?.envs,
      overrides: {
        db: 1,
      },
    });

    return definePreset(
      {
        TaskQueue: redisConfig,
        LocalTaskWorkerModule: VanillaTaskWorkerModules.defaultConfig(),
      },
      options?.overrides
    );
  }
  static settlementScript(options?: {
    preset?: Environment;
    envs?: Partial<SettlementEnv>;
    overrides?: ConfigOverrides;
  }): ConfigOverrides {
    const settlementConfig = DefaultConfigs.settlement({
      preset: options?.preset,
      envs: options?.envs,
    });
    return definePreset(
      {
        ...settlementConfig,
        SequencerStartupModule: {},
        TaskQueue: {
          simulatedDuration: 0,
        },
        Mempool: {},
      },
      options?.overrides
    );
  }
}
