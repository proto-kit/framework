/* eslint-disable no-console,sonarjs/no-nested-template-literals */
import "reflect-metadata";

import * as path from "path";
import { exit } from "process";
import { pathToFileURL } from "node:url";

import { log } from "@proto-kit/common";
import {
  Block,
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

export interface BlockExtras {
  block?: Block;
  blockError?: string;
  logs: string[];
  height?: number;
  duration: number;
  time: string;
}
export interface ChainState {
  blocks: BlockExtras[];
  isProducingBlock: boolean;
  isStarted: boolean;
  blockTime: number;
  nextTrigger?: number;
}

let blockTime = 5000;
export const gqlUrl = "http://localhost:8080/graphql";

const chainState: ChainState = {
  blocks: [],
  isProducingBlock: false,
  isStarted: false,
  blockTime,
};

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
      table.push(["GraphiQL URL", `${gqlUrl}`]);
      console.log(table.toString());
    }
  );
}

async function produceBlock(trigger: ManualBlockTrigger) {
  return await trigger.produceUnproven();
}

export function printBlockDetails(
  block: Block | undefined,
  blockHeight: number,
  blockGenerationTime: number,
  methodIdResolver: MethodIdResolver
) {
  const txnCount = block?.transactions?.length ?? 0;
  process.stdout.write(ansiEscapes.eraseEndLine);
  let str = `[${chalk.gray(new Date().toLocaleTimeString())}]`;
  str += ` Block #${chalk.whiteBright(blockHeight.toString())}`;
  str += `\t${chalk.gray(`took ${blockGenerationTime}ms`)}`;
  str += ` ${chalk.gray(`(${txnCount} txns)`)}`;
  process.stdout.write(str);
  process.stdout.write(ansiEscapes.eraseEndLine);
  process.stdout.write(ansiEscapes.cursorNextLine);
  if (block?.transactions) {
    for (let i = 0; i < txnCount; i++) {
      const txn = block.transactions[i];
      const name = methodIdResolver.getMethodNameFromId(
        txn.tx.methodId.toBigInt()
      );
      let txStr = `  ${chalk.gray("tx:") + i}`;
      // add method name
      if (name) {
        txStr += ` ${chalk.gray("method:")} ${chalk.bold.cyan(
          `${name[0]}.${name[1]}`
        )}`;
      } else {
        txStr += ` ${chalk.gray("method:")} ${chalk.redBright("unresolved")}`;
      }
      // add txn hash
      txStr += ` ${chalk.gray("hash:")} 0x${txn.tx
        .hash()
        .toBigInt()
        .toString(16)}`;
      process.stdout.write(txStr);
      process.stdout.write(ansiEscapes.eraseEndLine);
      process.stdout.write(ansiEscapes.cursorNextLine);
      // add status
      if (txn.status.toBoolean()) {
        txStr = `  ${chalk.gray("status:")}✅`;
      } else {
        txStr = `  ${chalk.gray("status:")}❌`;
        txStr += ` ${chalk.gray("statusMessage:")} ${chalk.redBright.bold(
          txn.statusMessage ?? ""
        )}`;
        // process.stdout.write(ansiEscapes.eraseEndLine);
      }
      process.stdout.write(txStr);
      process.stdout.write(ansiEscapes.eraseEndLine);
      process.stdout.write(ansiEscapes.cursorNextLine);
    }
  }
}

async function displayChainStats(mempool: PrivateMempool) {
  setInterval(async () => {
    const pendingTxns = await mempool.getTxs();
    const remaining = Math.floor(
      Math.max(0, (chainState.nextTrigger ?? 0) - Date.now()) / 1000
    );

    const table = new Table({});
    table.push([
      `Transactions in Mempool: ${pendingTxns.length}`,
      `Producing Next Block in ${remaining}s`,
    ]);
    // process.stdout.write(ansiEscapes.cursorSavePosition);
    // process.stdout.write(ansiEscapes.cursorRestorePosition);
    console.log(table.toString());
    process.stdout.write(ansiEscapes.cursorPrevLine);
    process.stdout.write(ansiEscapes.cursorPrevLine);
    process.stdout.write(ansiEscapes.cursorPrevLine);
    process.stdout.write(ansiEscapes.cursorHide);
  }, 100);
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

  // TODO
  // appChain.events.on("tick", (totalTime: number) => {
  //   dispatch({ type: "TICK", totalTime });
  // });

  const trigger = appChain.sequencer.resolveOrFail(
    "BlockTrigger",
    ManualBlockTrigger
  );
  const methodIdResolver = appChain.resolveOrFail(
    "MethodIdResolver",
    MethodIdResolver
  );
  const mempool = appChain.sequencer.resolveOrFail("Mempool", PrivateMempool);
  let blockHeight = 0;
  let blockGenerationTime = 0;
  const Looper = async () => {
    chainState.isProducingBlock = true;
    const startTime = Date.now();
    try {
      const unprovenBlock = await produceBlock(trigger);
      blockGenerationTime = Date.now() - startTime;
      chainState.isProducingBlock = false;
      chainState.nextTrigger =
        Date.now() + Math.max(0, blockTime - blockGenerationTime);
      chainState.blocks.push({
        block: unprovenBlock,
        logs: [],
        duration: blockGenerationTime,
        // time in 12 hr format
        time: new Date().toLocaleTimeString(),
      });
      printBlockDetails(
        unprovenBlock,
        blockHeight,
        blockGenerationTime,
        methodIdResolver
      );
      blockHeight += 1;
    } catch (e: any) {
      process.stdout.write(ansiEscapes.eraseEndLine);
      console.log(
        `[${chalk.gray(
          new Date().toLocaleTimeString()
        )}] Block #${blockHeight} (${chalk.gray(blockGenerationTime.toString())}ms)\n`
      );
      console.error(e);
    }
    setTimeout(Looper, blockTime - blockGenerationTime);
  };
  void Looper();
  void displayChainStats(mempool);
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
