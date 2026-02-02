import * as fs from "fs";
import * as path from "path";

import inquirer from "inquirer";
import figuresLib from "@inquirer/figures";
import { cyan, green, blue, gray, bold } from "kleur/colors";

/* eslint-disable no-console */

export const icons = {
  checkmark: figuresLib.tick,
  cross: figuresLib.cross,
  arrow: figuresLib.pointerSmall,
  circle: figuresLib.bullet,
  square: figuresLib.square,
};

export type PresetType = "inmemory" | "development" | "sovereign";

export interface WizardAnswers {
  environmentName: string;
  preset: PresetType;
  includeIndexer: boolean;
  includeProcessor: boolean;
  includeMetrics: boolean;
  settlementEnabled: boolean;
}

export const PRESET_ENV_NAMES: Record<PresetType, string> = {
  inmemory: "inmemory",
  development: "development",
  sovereign: "sovereign",
};

export const PRESET_DESCRIPTIONS: Record<PresetType, string> = {
  inmemory: "Fast testing and development environment",
  development: "Local development environment",
  sovereign: "Production-ready environment",
};

export const PRESET_LABELS: Record<PresetType, string> = {
  inmemory: "In-Memory",
  development: "Development",
  sovereign: "Sovereign",
};

export function printHeader(): void {
  console.log(bold(cyan("  ╔════════════════════════════════════════╗")));
  console.log(bold(cyan("  ║   🚀  Proto-Kit Environment Wizard     ║")));
  console.log(bold(cyan("  ╚════════════════════════════════════════╝")));
  console.log("");
}

export function printSection(title: string): void {
  const section = `${icons.square} ${title}`;
  console.log(`\n${bold(blue(section))}`);
  console.log(gray("-".repeat(50)));
  console.log("");
}

export async function selectPreset(): Promise<PresetType> {
  const presetTypes: PresetType[] = ["inmemory", "development", "sovereign"];
  const answer = await inquirer.prompt<{ preset: PresetType }>([
    {
      type: "list",
      name: "preset",
      message: "Select Environment Preset",
      choices: presetTypes.map((type) => {
        const label = PRESET_LABELS[type];
        const description = PRESET_DESCRIPTIONS[type];
        return {
          name: `${label} - ${description}`,
          value: type,
        };
      }),
    },
  ]);

  return answer.preset;
}

export async function selectModules(preset: PresetType): Promise<{
  includeIndexer: boolean;
  includeProcessor: boolean;
  includeMetrics: boolean;
  settlementEnabled: boolean;
}> {
  const isInMemory = preset === "inmemory";

  const answers = await inquirer.prompt<{
    includeIndexer: boolean;
    includeProcessor: boolean;
    includeMetrics: boolean;
    settlementEnabled: boolean;
  }>([
    {
      type: "confirm",
      name: "includeIndexer",
      message: "Include Indexer Module?",
      default: false,
      when: !isInMemory,
    },
    {
      type: "confirm",
      name: "includeProcessor",
      message: "Include Processor Module? (requires Indexer)",
      default: false,
      when: (ans: WizardAnswers) => ans.includeIndexer === true,
    },
    {
      type: "confirm",
      name: "includeMetrics",
      message: "Include OpenTelemetry Metrics?",
      default: false,
    },
    {
      type: "confirm",
      name: "settlementEnabled",
      message: "Enable Settlement Module?",
      default: false,
    },
  ]);
  if (isInMemory && answers.includeIndexer === false) {
    answers.includeIndexer = false;
  }
  if (answers.includeProcessor === false) {
    answers.includeProcessor = false;
  }

  return answers;
}

export async function promptUser(): Promise<WizardAnswers> {
  printHeader();

  printSection("Environment Configuration");

  const answers = await inquirer.prompt<{ environmentName: string }>([
    {
      type: "input",
      name: "environmentName",
      message: "Environment name (e.g 'production')",
      validate: (input: string) => {
        if (!input.trim()) {
          return "Environment name is required";
        }
        return true;
      },
    },
  ]);

  const environmentName = (answers.environmentName ?? "").trim();
  const confirmationMessage = `${icons.checkmark} Environment: ${environmentName}`;
  console.log(`${green(confirmationMessage)}\n`);

  const preset = await selectPreset();

  printSection("Configure Modules");
  const modules = await selectModules(preset);

  return {
    environmentName,
    preset,
    ...modules,
  };
}

export function generateChainConfig(answers: WizardAnswers): string {
  const presetEnv = PRESET_ENV_NAMES[answers.preset];
  const isInMemory = answers.preset === "inmemory";

  const moduleParts: string[] = [];

  if (answers.includeMetrics) {
    moduleParts.push("    ...DefaultModules.metrics(),");
  }
  if (isInMemory) {
    moduleParts.push("    ...DefaultModules.inMemoryDatabase(),");
  } else {
    moduleParts.push("    ...DefaultModules.prismaRedisDatabase(),");
  }
  moduleParts.push(
    `    ...DefaultModules.core({ settlementEnabled: ${answers.settlementEnabled} }),`
  );
  if (isInMemory) {
    moduleParts.push("    ...DefaultModules.localTaskQueue(),");
  } else {
    moduleParts.push("    ...DefaultModules.redisTaskQueue(),");
  }
  if (answers.includeIndexer) {
    moduleParts.push("    ...DefaultModules.sequencerIndexer(),");
  }
  const modulesString = moduleParts.join("\n");
  const configParts: string[] = [];
  const coreConfig = `    ...DefaultConfigs.core({ settlementEnabled: ${answers.settlementEnabled}, preset: "${presetEnv}" }),`;
  configParts.push(coreConfig);
  if (answers.includeIndexer) {
    configParts.push("    ...DefaultConfigs.sequencerIndexer(),");
  }
  if (answers.includeMetrics) {
    configParts.push(
      `    ...DefaultConfigs.metrics({ preset: "${presetEnv}" }),`
    );
  }
  if (isInMemory) {
    configParts.push("    ...DefaultConfigs.localTaskQueue(),");
    configParts.push("    ...DefaultConfigs.inMemoryDatabase(),");
  } else {
    configParts.push(
      `    ...DefaultConfigs.redisTaskQueue({
      preset: "${presetEnv}",
      overrides: {
        redisDb: 1,
      },
    }),`
    );
    configParts.push(
      `    ...DefaultConfigs.prismaRedisDatabase({
      preset: "${presetEnv}",
    }),`
    );
  }
  const configString = configParts.join("\n");
  return `import { Runtime } from "@proto-kit/module";
import { Protocol } from "@proto-kit/protocol";
import { AppChain, Sequencer } from "@proto-kit/sequencer";
import runtime from "../../../runtime";
import * as protocol from "../../../protocol";

import { Arguments } from "../../../start";
import { Startable } from "@proto-kit/common";
import { DefaultConfigs, DefaultModules } from "@proto-kit/stack";

const settlementEnabled = process.env.PROTOKIT_SETTLEMENT_ENABLED! === "true";

const appChain = AppChain.from({
  Runtime: Runtime.from(runtime.modules),
  Protocol: Protocol.from({
    ...protocol.modules,
    ...(settlementEnabled ? protocol.settlementModules : {}),
  }),
  Sequencer: Sequencer.from({
    // ordering of the modules matters due to dependency resolution
${modulesString}
  }),
  ...DefaultModules.appChainBase(),
});

export default async (args: Arguments): Promise<Startable> => {
  appChain.configurePartial({
    Runtime: runtime.config,
    Protocol: {
      ...protocol.config,
      ...(settlementEnabled ? protocol.settlementModulesConfig : {}),
    },
    Sequencer: {
${configString}
    },
    ...DefaultConfigs.appChainBase(),
  });

  return appChain;
};`;
}

export function generateIndexerConfig(answers: WizardAnswers): string {
  if (!answers.includeIndexer) {
    return "";
  }

  const presetEnv = PRESET_ENV_NAMES[answers.preset];

  return `import { Indexer } from "@proto-kit/indexer";
import { Arguments } from "../../../start";
import { Startable } from "@proto-kit/common";
import { DefaultConfigs, DefaultModules } from "@proto-kit/stack";

const indexer = Indexer.from({
  ...DefaultModules.indexer(),
});

export default async (args: Arguments): Promise<Startable> => {
  indexer.configurePartial({
    ...DefaultConfigs.indexer({
      preset: "${presetEnv}",
      overrides: {
        pruneOnStartup: args.pruneOnStartup,
        redisDb: 1,
      },
    }),
  });

  return indexer;
};`;
}

export function generateProcessorConfig(answers: WizardAnswers): string {
  if (!answers.includeProcessor || !answers.includeIndexer) {
    return "";
  }

  const presetEnv = PRESET_ENV_NAMES[answers.preset];

  return `import { DatabasePruneModule, Processor } from "@proto-kit/processor";
import { databaseModule } from "../../processor";
import { Arguments } from "../../../start";
import { Startable } from "@proto-kit/common";
import { DefaultConfigs, DefaultModules } from "@proto-kit/stack";

import { handlers } from "../../processor/handlers";
import { resolvers } from "../../processor/api/resolvers";

const processor = Processor.from({
  Database: databaseModule,
  DatabasePruneModule: DatabasePruneModule,
  ...DefaultModules.processor(resolvers, handlers),
});

export default async (args: Arguments): Promise<Startable> => {
  processor.configurePartial({
    ...DefaultConfigs.processor({
      preset: "${presetEnv}",
    }),
    Database: {},
    DatabasePruneModule: {
      pruneOnStartup: args.pruneOnStartup,
    },
  });

  return processor;
};`;
}

export function generateWorkerConfig(answers: WizardAnswers): string {
  if (answers.preset === "inmemory") {
    return "";
  }

  const presetEnv = PRESET_ENV_NAMES[answers.preset];
  const taskWorkerImports = answers.settlementEnabled
    ? ""
    : ` LocalTaskWorkerModule, VanillaTaskWorkerModules`;
  const withoutSettlementTask = answers.settlementEnabled
    ? ""
    : `LocalTaskWorkerModule: LocalTaskWorkerModule.from(
      VanillaTaskWorkerModules.withoutSettlement()
    ),
  `;
  return `import { Runtime } from "@proto-kit/module";
import { Protocol } from "@proto-kit/protocol";
import { Sequencer, AppChain, ${taskWorkerImports} } from "@proto-kit/sequencer";
import runtime from "../../../runtime";
import * as protocol from "../../../protocol";
import { Arguments } from "../../../start";

import { log, Startable } from "@proto-kit/common";
import { DefaultConfigs, DefaultModules } from "@proto-kit/stack";

const settlementEnabled = process.env.PROTOKIT_SETTLEMENT_ENABLED! === "true";

const appChain = AppChain.from({
  Runtime: Runtime.from(runtime.modules),
  Protocol: Protocol.from({
    ...protocol.modules,
    ...(settlementEnabled ? protocol.settlementModules : {}),
  }),
  Sequencer: Sequencer.from({
    ...DefaultModules.worker(),
    ${withoutSettlementTask}
  }),
});

export default async (args: Arguments): Promise<Startable> => {
  appChain.configurePartial({
    Runtime: runtime.config,
    Protocol: {
      ...protocol.config,
      ...(settlementEnabled ? protocol.settlementModulesConfig : {}),
    },
    Sequencer: DefaultConfigs.worker({
      preset: "${presetEnv}",
      overrides: {
        redisDb: 1,
      },
    }),
  });

  log.setLevel("DEBUG");

  return appChain;
};`;
}

export function copyAndUpdateEnvFile(
  answers: WizardAnswers,
  cwd: string,
  envDir: string
): boolean {
  const presetEnvPath = path.join(
    cwd,
    "src/core/environments",
    answers.preset,
    ".env"
  );

  if (!fs.existsSync(presetEnvPath)) {
    console.warn(`Could not find .env file at ${presetEnvPath}`);
    return false;
  }

  try {
    let envContent = fs.readFileSync(presetEnvPath, "utf-8");

    if (envContent.includes("PROTOKIT_ENV_FOLDER=")) {
      envContent = envContent.replace(
        /PROTOKIT_ENV_FOLDER=.*/g,
        `PROTOKIT_ENV_FOLDER=${answers.environmentName}`
      );
    } else {
      const envFolder = `PROTOKIT_ENV_FOLDER=${answers.environmentName}`;
      envContent = `${envFolder}\n${envContent}`;
    }

    if (envContent.includes("PROTOKIT_SETTLEMENT_ENABLED=")) {
      envContent = envContent.replace(
        /PROTOKIT_SETTLEMENT_ENABLED=.*/g,
        `PROTOKIT_SETTLEMENT_ENABLED=${answers.settlementEnabled}`
      );
    } else {
      envContent += `\nPROTOKIT_SETTLEMENT_ENABLED=${answers.settlementEnabled}\n`;
    }

    const envFilePath = path.join(envDir, ".env");
    fs.writeFileSync(envFilePath, envContent);

    return true;
  } catch (error) {
    console.error(`Error copying .env file: ${error}}`);
    return false;
  }
}
/* eslint-enable no-console */
