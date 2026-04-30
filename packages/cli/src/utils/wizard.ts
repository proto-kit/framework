/* eslint-disable @typescript-eslint/quotes */
import * as fs from "fs";
import * as path from "path";

import inquirer from "inquirer";
import figuresLib from "@inquirer/figures";
import { cyan, green, blue, gray, bold } from "kleur/colors";

import { resolveChainPath } from "./pathResolver";

export const icons = {
  checkmark: figuresLib.tick,
  cross: figuresLib.cross,
  arrow: figuresLib.pointerSmall,
  circle: figuresLib.bullet,
  square: figuresLib.square,
};

export type PresetType = "inmemory" | "development" | "sovereign";
export type DatabaseType = "inmemory" | "prisma-redis";
export type WorkerType = "local" | "remote";

export interface WizardAnswers {
  environmentName: string;
  preset: PresetType;
  database: DatabaseType;
  worker: WorkerType;
  settlement: boolean;
  bridging: boolean;
  includeIndexer: boolean;
  includeProcessor: boolean;
  includeMetrics: boolean;
}

const PRESETS: Record<PresetType, { label: string; desc: string }> = {
  inmemory: { label: "In-Memory", desc: "Fast testing (no persistence)" },
  development: { label: "Development", desc: "Local dev with Prisma + Redis" },
  sovereign: { label: "Sovereign", desc: "Production-ready" },
};

const printHeader = () => {
  console.log(bold(cyan("  ╔════════════════════════════════════════╗")));
  console.log(bold(cyan("  ║   🚀  Proto-Kit Environment Wizard     ║")));
  console.log(bold(cyan("  ╚════════════════════════════════════════╝\n")));
};

const printSection = (title: string) => {
  const sectionTitle = `${icons.square} ${title}`;
  console.log(`\n${bold(blue(sectionTitle))}`);
  console.log(gray("-".repeat(50)), "\n");
};

export async function promptUser(): Promise<WizardAnswers> {
  printHeader();
  printSection("Environment Configuration");

  const { environmentName } = await inquirer.prompt<{
    environmentName: string;
  }>([
    {
      type: "input",
      name: "environmentName",
      message: "Environment name (e.g 'production')",
      validate: (i: string) =>
        i.trim() ? true : "Environment name is required",
    },
  ]);
  const trimmedName = environmentName.trim();
  console.log(green(`${icons.checkmark} Environment: ${trimmedName}\n`));

  printSection("Select Preset");
  const { preset } = await inquirer.prompt<{ preset: PresetType }>([
    {
      type: "list",
      name: "preset",
      message: "Select Preset (.env template)",
      choices: Object.entries(PRESETS).map(([key, env]) => ({
        name: `${env.label} - ${env.desc}`,
        value: key,
      })),
    },
  ]);
  console.log(green(`${icons.checkmark} Preset: ${PRESETS[preset].label}\n`));

  printSection("Infrastructure Configuration");
  const { database } = await inquirer.prompt<{ database: DatabaseType }>([
    {
      type: "list",
      name: "database",
      message: "Select Database",
      default: preset === "inmemory" ? "inmemory" : "prisma-redis",
      choices: [
        { name: "In-Memory - No persistence", value: "inmemory" },
        { name: "Prisma + Redis - Production-ready", value: "prisma-redis" },
      ],
    },
  ]);

  let worker: WorkerType = "local";
  let settlement = false;
  let bridging = false;
  let includeIndexer = false;
  let includeProcessor = false;
  let includeMetrics = false;

  if (database === "prisma-redis") {
    const workerPrompt = await inquirer.prompt<{ worker: WorkerType }>([
      {
        type: "list",
        name: "worker",
        message: "Worker Type",
        choices: [
          { name: "Local - Local process", value: "local" },
          { name: "Remote - BullQueue + worker process", value: "remote" },
        ],
      },
    ]);
    worker = workerPrompt.worker;

    printSection("Settlement Configuration");
    const settlementPrompt = await inquirer.prompt<{ settlement: boolean }>([
      {
        type: "confirm",
        name: "settlement",
        message: "Enable Settlement?",
        default: false,
      },
    ]);
    settlement = settlementPrompt.settlement;
    if (settlement) {
      const bridgingPrompt = await inquirer.prompt<{ bridging: boolean }>([
        {
          type: "confirm",
          name: "bridging",
          message: "Enable Bridging?",
          default: true,
        },
      ]);
      bridging = bridgingPrompt.bridging;
    }

    printSection("Additional Modules");
    const modulesPrompt = await inquirer.prompt<{
      includeIndexer: boolean;
      includeProcessor: boolean;
      includeMetrics: boolean;
    }>([
      {
        type: "confirm",
        name: "includeIndexer",
        message: "Include Indexer?",
        default: false,
        when: () => worker === "remote",
      },
      {
        type: "confirm",
        name: "includeProcessor",
        message: "Include Processor?",
        default: false,
        when: (answer) => answer.includeIndexer,
      },
      {
        type: "confirm",
        name: "includeMetrics",
        message: "Include Metrics?",
        default: false,
      },
    ]);
    includeIndexer = modulesPrompt.includeIndexer ?? false;
    includeProcessor = modulesPrompt.includeProcessor ?? false;
    includeMetrics = modulesPrompt.includeMetrics ?? false;
  }

  return {
    environmentName: trimmedName,
    preset,
    database,
    worker,
    settlement,
    bridging,
    includeIndexer,
    includeProcessor,
    includeMetrics,
  };
}

function formatImportStatement(imports: string[], packageName: string): string {
  if (imports.length <= 2) {
    return `import { ${imports.join(", ")} } from "${packageName}";`;
  }

  return `import {
  ${imports.join(",\n  ")},
} from "${packageName}";`;
}

function buildSequencerImports(answer: WizardAnswers): string[] {
  const imports = [
    "AppChain",
    "Sequencer",
    "PrivateMempool",
    "TimedBlockTrigger",
  ];

  if (answer.database === "inmemory") {
    imports.push("InMemoryDatabase");
  }

  if (answer.worker === "local") {
    imports.push("LocalTaskQueue", "WorkerModule", "VanillaTaskWorkerModules");
  }

  imports.push(
    answer.settlement ? "SequencerCoreModule" : "LocalSequencerCoreModule"
  );

  if (answer.settlement) {
    imports.push(
      "MinaBaseLayer",
      "ConstantFeeStrategy",
      "SettlementModule",
      "InMemoryMinaSigner"
    );
    if (answer.bridging) {
      imports.push("BridgingModule");
    }
  }

  return imports;
}

function buildImportStatements(answer: WizardAnswers): string[] {
  const seqImports = buildSequencerImports(answer);
  const imports = [
    `import { Runtime } from "@proto-kit/module";`,
    `import { Protocol } from "@proto-kit/protocol";`,
    formatImportStatement(seqImports, "@proto-kit/sequencer"),
    `import { VanillaGraphqlModules, GraphqlSequencerModule } from "@proto-kit/api";`,
  ];

  if (answer.database === "prisma-redis") {
    imports.push(
      `import { PrismaRedisDatabase } from "@proto-kit/persistance";`
    );
  }
  if (answer.worker === "remote") {
    imports.push(`import { BullQueue } from "@proto-kit/deployment";`);
  }
  if (answer.includeIndexer) {
    imports.push(`import { IndexerNotifier } from "@proto-kit/indexer";`);
  }

  imports.push(
    formatImportStatement(
      [
        "BlockStorageNetworkStateModule",
        "InMemoryTransactionSender",
        "StateServiceQueryModule",
      ],
      "@proto-kit/sdk"
    ),
    `import { Startable } from "@proto-kit/common";`,
    `import runtime from "../../../runtime";`,
    `import * as protocol from "../../../protocol";`
  );

  if (answer.database === "prisma-redis") {
    imports.push(`import { Arguments } from "../../../start";`);
  }
  if (answer.settlement) {
    imports.push(`import { PrivateKey } from "o1js";`);
    imports.push(
      `import {
  buildCustomTokenConfig,
  buildSettlementTokenConfig,
} from "@proto-kit/stack";`
    );
    if (!answer.bridging) {
      imports.push(
        `import { SettlementContractModule } from "@proto-kit/protocol";`
      );
    }
  }
  if (answer.includeMetrics) {
    imports.push(
      `import {
  metricsSequencerModules,
  metricsSequencerModulesConfig,
} from "../../sequencer";`
    );
  }

  return imports;
}

function buildSequencerModules(answer: WizardAnswers): string[] {
  const modules: string[] = [];

  if (answer.includeMetrics) {
    modules.push("...metricsSequencerModules,");
  }

  modules.push(
    answer.database === "inmemory"
      ? "Database: InMemoryDatabase,"
      : "Database: PrismaRedisDatabase,"
  );

  if (answer.worker === "remote") {
    modules.push("TaskQueue: BullQueue,");
  } else {
    const tasks = answer.settlement ? "allTasks()" : "withoutSettlement()";
    modules.push(
      "TaskQueue: LocalTaskQueue,",
      `WorkerModule: WorkerModule.from(
      VanillaTaskWorkerModules.${tasks}
    ),`
    );
  }

  modules.push(
    "Graphql: GraphqlSequencerModule.from(VanillaGraphqlModules.with({})),",
    "Mempool: PrivateMempool,",
    "BlockTrigger: TimedBlockTrigger,"
  );

  modules.push(
    answer.settlement ? "SequencerCoreModule," : "LocalSequencerCoreModule,"
  );

  if (answer.settlement) {
    modules.push(
      "BaseLayer: MinaBaseLayer,",
      "FeeStrategy: ConstantFeeStrategy,",
      "SettlementModule,",
      "SettlementSigner: InMemoryMinaSigner,"
    );
    if (answer.bridging) {
      modules.push("BridgingModule,");
    }
  }
  if (answer.includeIndexer) {
    modules.push("IndexerNotifier,");
  }

  return modules;
}

function buildDatabaseConfig(answer: WizardAnswers): string[] {
  const config: string[] = [];

  if (answer.database === "inmemory") {
    config.push("Database: {},");
  } else {
    config.push(
      `Database: {
        redis: {
          host: process.env.REDIS_HOST!,
          port: Number(process.env.REDIS_PORT!),
          password: process.env.REDIS_PASSWORD,
        },
        prisma: { connection: process.env.DATABASE_URL! },
        pruneOnStartup: args.pruneOnStartup,
      },`
    );
  }

  return config;
}

function buildWorkerConfig(answer: WizardAnswers): string[] {
  const config: string[] = [];

  if (answer.worker === "remote") {
    config.push(
      `TaskQueue: {
        redis: {
          host: process.env.REDIS_HOST!,
          port: Number(process.env.REDIS_PORT!),
          password: process.env.REDIS_PASSWORD,
          db: 1,
        },
      },`
    );
  } else {
    config.push(
      "TaskQueue: {},",
      "WorkerModule: VanillaTaskWorkerModules.defaultConfig(),"
    );
  }

  return config;
}

function buildBlockTriggerConfig(answer: WizardAnswers): string {
  const interval = answer.database === "inmemory" ? 5000 : 30000;

  if (answer.settlement) {
    return `BlockTrigger: {
        blockInterval: ${interval},
        produceEmptyBlocks: true,
        settlementInterval: 60000,
        settlementTokenConfig: buildSettlementTokenConfig(
          process.env.PROTOKIT_MINA_BRIDGE_CONTRACT_PRIVATE_KEY!,
          buildCustomTokenConfig(
            process.env.PROTOKIT_CUSTOM_TOKEN_PRIVATE_KEY,
            process.env.PROTOKIT_CUSTOM_TOKEN_BRIDGE_PRIVATE_KEY
          )
        ),
      },`;
  }

  return `BlockTrigger: {
        blockInterval: ${interval},
        produceEmptyBlocks: true,
        settlementTokenConfig: {},
      },`;
}

function buildCoreModuleConfig(answer: WizardAnswers): string {
  if (answer.settlement) {
    return `SequencerCoreModule: {
        BlockProducerModule: {},
        BatchProducerModule: {},
        SequencerStartupModule: {},
      },`;
  }

  return `LocalSequencerCoreModule: {
        SequencerStartupModule: {},
        BlockProducerModule: {},
      },`;
}

function buildSettlementConfig(answer: WizardAnswers): string[] {
  const config: string[] = [];

  if (!answer.settlement) return config;

  config.push(
    `BaseLayer: {
        network: {
          type:
            (process.env.MINA_NETWORK as "local" | "lightnet" | "remote") ??
            "lightnet",
          graphql: \`\${process.env.MINA_NODE_GRAPHQL_HOST}:\${process.env.MINA_NODE_GRAPHQL_PORT}/graphql\`,
          archive: \`\${process.env.MINA_ARCHIVE_GRAPHQL_HOST}:\${process.env.MINA_ARCHIVE_GRAPHQL_PORT}\`,
          accountManager: \`\${process.env.MINA_ACCOUNT_MANAGER_HOST}:\${process.env.MINA_ACCOUNT_MANAGER_PORT}\`,
        },
      },`,
    "FeeStrategy: {},",
    `SettlementModule: {
        addresses: {
          SettlementContract: PrivateKey.fromBase58(
            process.env.PROTOKIT_SETTLEMENT_CONTRACT_PRIVATE_KEY!
          ).toPublicKey(),
        },
      },`,
    `SettlementSigner: {
        feepayer: PrivateKey.fromBase58(
          process.env.PROTOKIT_SEQUENCER_PRIVATE_KEY!
        ),
        contractKeys: [
          PrivateKey.fromBase58(
            process.env.PROTOKIT_SETTLEMENT_CONTRACT_PRIVATE_KEY!
          ),
          PrivateKey.fromBase58(
            process.env.PROTOKIT_DISPATCHER_CONTRACT_PRIVATE_KEY!
          ),
          PrivateKey.fromBase58(
            process.env.PROTOKIT_MINA_BRIDGE_CONTRACT_PRIVATE_KEY!
          ),
        ],
      },`
  );

  if (answer.bridging) {
    config.push(
      `BridgingModule: {
        addresses: {
          DispatchContract: PrivateKey.fromBase58(
            process.env.PROTOKIT_DISPATCHER_CONTRACT_PRIVATE_KEY!
          ).toPublicKey(),
        },
      },`
    );
  }

  return config;
}

function buildSequencerConfig(answer: WizardAnswers): string[] {
  const config: string[] = [];

  if (answer.includeMetrics) {
    config.push("...metricsSequencerModulesConfig,");
  }

  config.push(...buildDatabaseConfig(answer));
  config.push(...buildWorkerConfig(answer));
  config.push(
    `Graphql: {
        ...VanillaGraphqlModules.defaultConfig(),
        containerConfig: {
          port: Number(process.env.PROTOKIT_GRAPHQL_PORT),
          host: process.env.PROTOKIT_GRAPHQL_HOST!,
          graphiql: true,
        },
      },`
  );
  config.push("Mempool: {},");
  config.push(buildBlockTriggerConfig(answer));
  config.push(buildCoreModuleConfig(answer));
  config.push(...buildSettlementConfig(answer));

  if (answer.includeIndexer) {
    config.push("IndexerNotifier: {},");
  }

  return config;
}

function buildProtocolConfig(answer: WizardAnswers): string {
  if (!answer.settlement) {
    return "protocol.modules";
  }

  if (answer.settlement && !answer.bridging) {
    return `{
    ...protocol.modules,
    SettlementContractModule: SettlementContractModule.from(
      SettlementContractModule.settlementOnly()
    ),
  }`;
  }

  return `{
    ...protocol.modules,
    ...protocol.settlementModules,
  }`;
}

function buildProtocolConfigData(answer: WizardAnswers): string {
  if (!answer.settlement) {
    return "protocol.config";
  }

  if (answer.settlement && !answer.bridging) {
    return `{
    ...protocol.config,
    SettlementContractModule: {
      SettlementContract: {},
    },
  }`;
  }

  return "{ ...protocol.config, ...protocol.settlementModulesConfig }";
}

export function generateChainConfig(answer: WizardAnswers): string {
  const imports = buildImportStatements(answer);
  const modules = buildSequencerModules(answer);
  const config = buildSequencerConfig(answer);
  const protocolMods = buildProtocolConfig(answer);
  const protocolCfg = buildProtocolConfigData(answer);
  const hasArgument = answer.database === "prisma-redis";

  return `${imports.join("\n")}

const appChain = AppChain.from({
  Runtime: Runtime.from(runtime.modules),
  Protocol: Protocol.from(${protocolMods}),
  Sequencer: Sequencer.from({
    ${modules.join("\n    ")}
  }),
  TransactionSender: InMemoryTransactionSender,
  QueryTransportModule: StateServiceQueryModule,
  NetworkStateTransportModule: BlockStorageNetworkStateModule,
});

export default async ${
    hasArgument ? "(args: Arguments)" : "()"
  }: Promise<Startable> => {
  appChain.configure({
    Runtime: runtime.config,
    Protocol: ${protocolCfg},
    Sequencer: {
      ${config.join("\n      ")}
    },
    QueryTransportModule: {},
    NetworkStateTransportModule: {},
    TransactionSender: {},
  });
  return appChain;
};
`;
}

export function generateIndexerConfig(): string {
  return `import {
  Indexer,
  IndexBlockTask,
  IndexBatchTask,
  IndexPendingTxTask,
  IndexSettlementTask,
  GeneratedResolverFactoryGraphqlModule,
} from "@proto-kit/indexer";
import { GraphqlSequencerModule } from "@proto-kit/api";
import { WorkerModule } from "@proto-kit/sequencer";
import { PrismaRedisDatabase } from "@proto-kit/persistance";
import { BullQueue } from "@proto-kit/deployment";
import { Arguments } from "../../../start";
import { Startable } from "@proto-kit/common";

const indexer = Indexer.from({
  Database: PrismaRedisDatabase,
  TaskQueue: BullQueue,
  TaskWorker: WorkerModule.from({
    IndexBlockTask,
    IndexPendingTxTask,
    IndexBatchTask,
    IndexSettlementTask,
  }),
  Graphql: GraphqlSequencerModule.from({
    GeneratedResolverFactory: GeneratedResolverFactoryGraphqlModule,
  }),
});

export default async (args: Arguments): Promise<Startable> => {
  indexer.configurePartial({
    Database: {
      redis: {
        host: process.env.REDIS_HOST ?? "localhost",
        port: Number(process.env.REDIS_PORT ?? 6379),
        password: process.env.REDIS_PASSWORD ?? "password",
      },
      prisma: {
        connection: process.env.INDEXER_DATABASE_URL!,
      },
      pruneOnStartup: args.pruneOnStartup,
    },
    TaskQueue: {
      redis: {
        host: process.env.REDIS_HOST ?? "localhost",
        port: Number(process.env.REDIS_PORT ?? 6379),
        password: process.env.REDIS_PASSWORD ?? "password",
        db: 1,
      },
    },
    TaskWorker: {
      IndexBlockTask: {},
      IndexBatchTask: {},
      IndexPendingTxTask: {},
      IndexSettlementTask: {},
    },
    Graphql: {
      GeneratedResolverFactory: {},
      containerConfig: {
        port: Number(process.env.PROTOKIT_INDEXER_GRAPHQL_PORT ?? 8081),
        host: process.env.PROTOKIT_INDEXER_GRAPHQL_HOST ?? "0.0.0.0",
        graphiql: true,
      },
    },
  });
  return indexer;
};
`;
}

export function generateProcessorConfig(): string {
  return `import {
  DatabasePruneModule,
  Processor,
  TimedProcessorTrigger,
  BlockFetching,
  HandlersExecutor,
  ResolverFactoryGraphqlModule,
} from "@proto-kit/processor";
import { GraphqlSequencerModule } from "@proto-kit/api";
import { databaseModule } from "../../processor";
import { Arguments } from "../../../start";
import { Startable } from "@proto-kit/common";
import { resolvers } from "../../processor/api/resolvers";
import { handlers } from "../../processor/handlers";

const processor = Processor.from({
  Database: databaseModule,
  DatabasePruneModule,
  GraphqlSequencerModule: GraphqlSequencerModule.from({
    ResolverFactory: ResolverFactoryGraphqlModule.from(resolvers),
  }),
  HandlersExecutor: HandlersExecutor.from(handlers),
  BlockFetching,
  Trigger: TimedProcessorTrigger,
});

export default async (args: Arguments): Promise<Startable> => {
  processor.configurePartial({
    HandlersExecutor: {},
    BlockFetching: {
      url: \`http://\${process.env.PROTOKIT_PROCESSOR_INDEXER_GRAPHQL_HOST}:\${process.env.PROTOKIT_INDEXER_GRAPHQL_PORT}\`,
    },
    Trigger: { interval: 6000 },
    GraphqlSequencerModule: {
      ResolverFactory: {},
      containerConfig: {
        port: Number(process.env.PROTOKIT_PROCESSOR_GRAPHQL_PORT),
        host: process.env.PROTOKIT_PROCESSOR_GRAPHQL_HOST!,
        graphiql: true,
      },
    },
    Database: {},
    DatabasePruneModule: { pruneOnStartup: args.pruneOnStartup },
  });
  return processor;
};
`;
}

export function generateWorkerConfig(answer: WizardAnswers): string {
  if (answer.worker === "local") return "";
  const tasks = answer.settlement ? "allTasks()" : "withoutSettlement()";
  const protocolMods = answer.settlement
    ? `{
    ...protocol.modules,
    ...protocol.settlementModules,
  }`
    : "protocol.modules";
  const protocolCfg = answer.settlement
    ? "{ ...protocol.config, ...protocol.settlementModulesConfig }"
    : "protocol.config";

  return `import { Runtime } from "@proto-kit/module";
import { Protocol } from "@proto-kit/protocol";
import { 
  Sequencer,
  AppChain,
  WorkerModule,
  VanillaTaskWorkerModules,
} from "@proto-kit/sequencer";
import { BullQueue } from "@proto-kit/deployment";
import runtime from "../../../runtime";
import * as protocol from "../../../protocol";
import { Arguments } from "../../../start";
import { log, Startable } from "@proto-kit/common";

const appChain = AppChain.from({
  Runtime: Runtime.from(runtime.modules),
  Protocol: Protocol.from(${protocolMods}),
  Sequencer: Sequencer.from({
    TaskQueue: BullQueue,
    WorkerModule: WorkerModule.from(
      VanillaTaskWorkerModules.${tasks}
    ),
  }),
});

export default async (args: Arguments): Promise<Startable> => {
  appChain.configure({
    Runtime: runtime.config,
    Protocol: ${protocolCfg},
    Sequencer: {
      WorkerModule: VanillaTaskWorkerModules.defaultConfig(),
      TaskQueue: {
        redis: {
          host: process.env.REDIS_HOST!,
          port: Number(process.env.REDIS_PORT!),
          password: process.env.REDIS_PASSWORD,
          db: 1,
        },
      },
    },
  });
  log.setLevel("DEBUG");
  return appChain;
};
`;
}

export function copyAndUpdateEnvFile(
  answer: WizardAnswers,
  envDir: string
): boolean {
  const presetEnvPath = path.join(
    resolveChainPath(true),
    "src",
    "core",
    "environments",
    answer.preset,
    ".env"
  );
  if (!fs.existsSync(presetEnvPath)) {
    console.warn(`Could not find .env at ${presetEnvPath}`);
    return false;
  }
  try {
    let content = fs.readFileSync(presetEnvPath, "utf-8");
    content = content.includes("PROTOKIT_ENV_FOLDER=")
      ? content.replace(
          /PROTOKIT_ENV_FOLDER=.*/g,
          `PROTOKIT_ENV_FOLDER=${answer.environmentName}`
        )
      : `PROTOKIT_ENV_FOLDER=${answer.environmentName}\n${content}`;
    fs.writeFileSync(path.join(envDir, ".env"), content);
    return true;
  } catch (e) {
    console.error(`Error copying .env: ${e}`);
    return false;
  }
}
/* eslint-enable @typescript-eslint/quotes */
