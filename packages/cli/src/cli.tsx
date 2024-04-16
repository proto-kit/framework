#!/usr/bin/env node --experimental-specifier-resolution=node --experimental-vm-modules --experimental-wasm-modules --experimental-wasm-threads

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

// eslint-disable-next-line import/extensions
import { start } from "./commands/start.js";

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
yargs(hideBin(process.argv))
  .command(
    "start [configFile]",
    "Start the chain in development mode",
    {
      configFile: {
        default: "dist/chain.config.js",
      },
    },
    start
  )
  .help().argv;
