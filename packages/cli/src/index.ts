#!/usr/bin/env node
import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import {
  BlockStorageNetworkStateModule,
  InMemoryTransactionSender,
  StateServiceQueryModule,
} from "@proto-kit/sdk";
import { Protocol } from "@proto-kit/protocol";
import {
  AppChain,
  Sequencer,
  VanillaTaskWorkerModules,
} from "@proto-kit/sequencer";
import {
  InMemorySequencerModules,
  VanillaProtocolModules,
  VanillaRuntimeModules,
} from "@proto-kit/library";
import {
  GraphqlSequencerModule,
  GraphqlServer,
  VanillaGraphqlModules,
} from "@proto-kit/api";
import { Runtime } from "@proto-kit/module";

process.removeAllListeners("warning");
process.env.NODE_NO_WARNINGS = "1";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

async function isGraphQLEndpointUp(url: string): Promise<boolean> {
  return await new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.destroy();
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.end();
  });
}

async function waitForGraphQLEndpoint(
  url: string,
  retries = 8,
  intervalMs = 5000
) {
  for (let i = 0; i < retries; i++) {
    // eslint-disable-next-line no-await-in-loop
    if (await isGraphQLEndpointUp(url)) return;
    // eslint-disable-next-line no-await-in-loop
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), intervalMs);
    });
  }
  throw new Error(`GraphQL endpoint did not start after ${retries} attempts.`);
}

async function runCommand(
  command: string,
  args: string[],
  cwd = process.cwd()
): Promise<void> {
  return await new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd,
      stdio: ["inherit", "pipe", "pipe"],
      shell: true,
    });

    proc.stdout.on("data", () => {});
    proc.stderr.on("data", () => {});

    proc.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${command} ${args.join(" ")} failed with ${code}`))
    );

    proc.on("error", reject);
  });
}

function cleanUp(generatedPath: string) {
  try {
    fs.unlinkSync(generatedPath);
  } catch (e) {
    console.error("Failed to delete temporary config:", e);
  }
}

async function generateGqlDocs(gqlUrl: string) {
  const templatePath = path.resolve(dirname, "../spectaql.config.template.yml");
  const generatedPath = path.resolve(process.cwd(), "spectaql.config.yml");

  if (!fs.existsSync(templatePath)) {
    console.warn(
      `Template not found at ${templatePath}, skipping doc generation.`
    );
    return;
  }

  console.log("Preparing dynamic SpectaQL config...");

  let configContent = fs.readFileSync(templatePath, "utf8");
  const match = gqlUrl.match(/:(\d+)\//);
  const port = match ? match[1] : "8080";
  configContent = configContent.replace(/{{PORT}}/g, port);

  fs.writeFileSync(generatedPath, configContent);

  await waitForGraphQLEndpoint(gqlUrl, 8, 5000);

  console.log("Generating GraphQL docs...");
  await runCommand("npx", ["spectaql", generatedPath]);
  console.log("Docs generated successfully!");
  cleanUp(generatedPath);
}

await yargs(hideBin(process.argv))
  .command(
    "generate-gql-docs",
    "generate GraphQL docs",
    (yarg) =>
      yarg
        .option("port", {
          alias: "p",
          type: "number",
          default: 8080,
          describe: "Port for the GraphQL server if creating an AppChain",
        })
        .option("url", {
          alias: "u",
          type: "string",
          default: "http://localhost:8080/graphql",
          describe: "GraphQL endpoint to use if not starting AppChain",
        })
        .option("empty", {
          alias: "e",
          type: "boolean",
          default: false,
          describe: "Start a new AppChain instead of using existing URL",
        }),
    async (args) => {
      try {
        if (args.empty) {
          const { port } = args;
          console.log(`Starting AppChain on port ${port}...`);

          const appChain = AppChain.from({
            Runtime: Runtime.from(VanillaRuntimeModules.with({})),
            Protocol: Protocol.from(VanillaProtocolModules.with({})),
            Sequencer: Sequencer.from(
              InMemorySequencerModules.with({
                GraphqlServer: GraphqlServer,
                Graphql: GraphqlSequencerModule.from(
                  VanillaGraphqlModules.with({})
                ),
              })
            ),
            TransactionSender: InMemoryTransactionSender,
            QueryTransportModule: StateServiceQueryModule,
            NetworkStateTransportModule: BlockStorageNetworkStateModule,
          });

          appChain.configurePartial({
            Runtime: VanillaRuntimeModules.defaultConfig(),
            Protocol: VanillaProtocolModules.defaultConfig(),
            Sequencer: {
              Database: {},
              TaskQueue: {},
              LocalTaskWorkerModule: VanillaTaskWorkerModules.defaultConfig(),
              Mempool: {},
              BlockProducerModule: {},
              SequencerStartupModule: {},
              BlockTrigger: { blockInterval: 5000, produceEmptyBlocks: true },
              FeeStrategy: {},
              BaseLayer: {},
              BatchProducerModule: {},
              Graphql: VanillaGraphqlModules.defaultConfig(),
              GraphqlServer: { port, host: "localhost", graphiql: true },
            },
          });

          await appChain.start();
          console.log("AppChain started successfully!");

          const gqlUrl = `http://localhost:${port}/graphql`;
          await generateGqlDocs(gqlUrl);
        } else {
          console.log(`Using existing GraphQL endpoint: ${args.url}`);
          await generateGqlDocs(args.url);
        }

        process.exit(0);
      } catch (error) {
        console.error("Failed to start AppChain or generate docs:", error);
        process.exit(1);
      }
    }
  )
  .demandCommand()
  .help()
  .strict()
  .parse();
