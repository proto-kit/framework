#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { generateGqlDocsCommand } from "./commands/generateGqlDocs";

process.removeAllListeners("warning");
process.env.NODE_NO_WARNINGS = "1";

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
        await generateGqlDocsCommand(args);
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
