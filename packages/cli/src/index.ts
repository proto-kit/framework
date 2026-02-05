#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { generateGqlDocsCommand } from "./commands/generateGqlDocs";
import { runCommand } from "./commands/run/run";
import { explorerCommand } from "./commands/explorer/explorer";
import { wizardCommand } from "./commands/wizard";
import { settlementCommand } from "./commands/settlement/settlement";
import { lightnetCommand } from "./commands/lightnet/lightnet";
import { bridgeCommand } from "./commands/bridge/bridge";

process.removeAllListeners("warning");
process.env.NODE_NO_WARNINGS = "1";

await yargs(hideBin(process.argv))
  .scriptName("protokit")
  .usage("$0 <command> [options]")
  .strict()
  .command(generateGqlDocsCommand)
  .command(wizardCommand)
  .command(runCommand)
  .command(explorerCommand)
  .command(settlementCommand)
  .command(lightnetCommand)
  .command(bridgeCommand)
  .demandCommand(
    1,
    "You must specify a command. Use --help to see available commands."
  )
  .help("help")
  .alias("help", "h")
  .option("help", { describe: "Show help" })
  .strict()
  .parse();
