/* eslint-disable no-console,sonarjs/no-nested-template-literals */
import "reflect-metadata";

import * as path from "path";
import { exit } from "process";
import { pathToFileURL } from "node:url";

import { log } from "@proto-kit/common";
import {
  UnprovenBlock,
  ManualBlockTrigger,
  PrivateMempool,
} from "@proto-kit/sequencer";
import { AppChain } from "@proto-kit/sdk";
import { MethodIdResolver } from "@proto-kit/module";
import { Environments } from "@proto-kit/deployment";
import chalk from "chalk";
import Table from "cli-table";
import figlet from "figlet";
import ansiEscapes from "ansi-escapes";
import gradient from "gradient-string";

log.setLevel("ERROR");

let appChain: AppChain<any, any, any, any>;

export interface UnprovenBlockExtras {
  block?: UnprovenBlock;
  blockError?: string;
  logs: string[];
  height?: number;
  duration: number;
  time: string;
}
export interface ChainState {
  blocks: UnprovenBlockExtras[];
  isProducingBlock: boolean;
  isStarted: boolean;
  blockTime: number;
  nextTrigger?: number;
}

let blockTime = 5000;

function showWelcome({
  environment,
  configuration,
}: {
  environment: string;
  configuration: string;
}) {
  figlet(
    "PROTOKIT",
    { font: "Slant", horizontalLayout: "fitted" },
    (err, data) => {
      if (err) {
        console.log("Something went wrong...");
        console.dir(err);
        return;
      }
      console.log(gradient("orange", "#FF763C").multiline(data));
      console.log();
      console.log(
        gradient("orange", "#FF763C")("\tSandbox Network Started 🚀")
      );
      const table = new Table({});
      table.push(["Environment", environment]);
      table.push(["Configuration", configuration]);
      console.log(table.toString());
    }
  );
}

async function startChain(args: {
  configFile: string;
  environment: string;
  configuration: string;
  logLevel: string;
  prune: boolean;
}) {
  // Normalize path to solve multiplatform issues
  let normalizedPath = args.configFile;
  if (path.sep === "\\") {
    normalizedPath.replace("/", "\\");
  }
  normalizedPath = pathToFileURL(normalizedPath).toString();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const environments: Environments<any> = (await import(normalizedPath))
    .default;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  appChain = await environments.start({
    ...args,
    returnInsteadOfStarting: true,
  });

  await appChain.start();

  const trigger = appChain.sequencer.resolveOrFail(
    "BlockTrigger",
    ManualBlockTrigger
  );
  const methodIdResolver = appChain.resolveOrFail(
    "MethodIdResolver",
    MethodIdResolver
  );
  const mempool = appChain.sequencer.resolveOrFail("Mempool", PrivateMempool);
}

export async function start(argv: {
  configFile: string;
  environment: string;
  configuration: string;
  logLevel: string;
  prune: boolean;
  blockTime: number;
}) {
  blockTime = argv.blockTime * 1000;
  showWelcome({
    environment: argv.environment,
    configuration: argv.configuration,
  });
  await startChain(argv);
}

const handleExit = () => {
  process.stdout.write(ansiEscapes.cursorShow);
  exit();
};
process.on("SIGINT", () => {
  handleExit();
});

/* eslint-enable no-console,sonarjs/no-nested-template-literals */
