/* eslint-disable no-console */
/* eslint-disable func-names */
/* eslint-disable sonarjs/cognitive-complexity */
import * as fs from "fs";
import * as path from "path";

import { cyan, green, red, bold } from "kleur/colors";

import {
  copyAndUpdateEnvFile,
  generateChainConfig,
  generateIndexerConfig,
  generateProcessorConfig,
  generateWorkerConfig,
  icons,
  promptUser,
} from "../../utils/create-environment";

export default async function () {
  try {
    const answers = await promptUser();

    const cwd = process.cwd();
    const envDir = path.join(
      cwd,
      "src/core/environments",
      answers.environmentName
    );

    if (!fs.existsSync(envDir)) {
      fs.mkdirSync(envDir, { recursive: true });
    }

    const chainConfigPath = path.join(envDir, "chain.config.ts");
    const indexerConfigPath = path.join(envDir, "indexer.config.ts");
    const processorConfigPath = path.join(envDir, "processor.config.ts");
    const workerConfigPath = path.join(envDir, "worker.config.ts");

    if (fs.existsSync(chainConfigPath)) {
      console.log(`\nEnvironment already exists at ${envDir}`);
      return;
    }

    copyAndUpdateEnvFile(answers, cwd, envDir);
    const chainConfig = generateChainConfig(answers);
    fs.writeFileSync(chainConfigPath, chainConfig);

    if (answers.includeIndexer) {
      const indexerConfig = generateIndexerConfig(answers);
      if (indexerConfig) {
        fs.writeFileSync(indexerConfigPath, indexerConfig);
      }
    }

    if (answers.includeProcessor && answers.includeIndexer) {
      const processorConfig = generateProcessorConfig(answers);
      if (processorConfig) {
        fs.writeFileSync(processorConfigPath, processorConfig);
      }
    }

    if (answers.preset !== "inmemory") {
      const workerConfig = generateWorkerConfig(answers);
      if (workerConfig) {
        fs.writeFileSync(workerConfigPath, workerConfig);
      }
    }

    console.log(
      `\n${bold(green("  ╔════════════════════════════════════════╗"))}`
    );
    console.log(
      `${bold(green("  ║   ✓  Environment Created Successfully  ║"))}`
    );
    console.log(
      `${bold(green("  ╚════════════════════════════════════════╝"))}`
    );
    console.log("");

    console.log(`${bold("Location:")}`);
    console.log(`  ${cyan(envDir)}\n`);

    console.log(`${bold("Generated Files:")}`);
    console.log(`  ${green(icons.checkmark)} .env`);
    console.log(`  ${green(icons.checkmark)} chain.config.ts`);
    if (answers.includeIndexer) {
      console.log(`  ${green(icons.checkmark)} indexer.config.ts`);
    }
    if (answers.includeProcessor && answers.includeIndexer) {
      console.log(`  ${green(icons.checkmark)} processor.config.ts`);
    }
    if (answers.preset !== "inmemory") {
      console.log(`  ${green(icons.checkmark)} worker.config.ts`);
    }

    console.log(`\n${bold("Next Steps:")}`);
    const cdCommand = `cd ${path.relative(process.cwd(), envDir)}`;
    console.log(`  1. ${cyan(cdCommand)}`);
    console.log(`  2. Update environment variables in ${cyan(".env")}`);
    console.log(
      `  3. Add the following script to your root ${cyan("package.json")}:`
    );
    const scriptCommand = `"env:${answers.environmentName}": "dotenv -e ./packages/chain/src/core/environments/${answers.environmentName}/.env -- pnpm"`;
    console.log(`${cyan(scriptCommand)}`);
    console.log("  4. Start your application\n");
  } catch (error) {
    console.log(`\n${bold(red("✗ Error"))}`);
    console.log(`${red("-".repeat(50))}`);
    console.error(`  ${error}`);
    console.log(`${red("-".repeat(50))}\n`);
    process.exit(1);
  }
}
/* eslint-enable no-console */
/* eslint-enable func-names */
/* eslint-enable sonarjs/cognitive-complexity */
