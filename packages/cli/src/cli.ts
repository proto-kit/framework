#!/usr/bin/env node --experimental-specifier-resolution=node --experimental-vm-modules --experimental-wasm-modules --experimental-wasm-threads

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { start } from "./commands/start.js";

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
yargs(hideBin(process.argv))
  .env("PROTOKIT")
  .command(
    "start [configFile]",
    "Start the chain in development mode",
    {
      configFile: {
        alias: "c",
        default: "dist/chain.config.js",
        describe: "Path to the chain configuration file",
        type: "string",
      },

      blockTime: {
        alias: "b",
        default: 5,
        describe: "block interval in seconds",
        type: "number",
      },
      environment: {
        default: "default",
        requiresArg: true,
        alias: ["env"],
      },
      configuration: {
        default: "sequencer",
        requiresArg: true,
        alias: ["config"],
      },
      logLevel: {
        type: "string",
        default: "DEBUG",
      },
      prune: {
        type: "boolean",
        default: false,
      },
    },
    start
  )
  .help().argv;
