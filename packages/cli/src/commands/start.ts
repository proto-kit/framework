//@ts-ignore
/* eslint-disable */
import "reflect-metadata";
import { Presets, log, TypedClass } from "@proto-kit/common";
import {
  UnprovenBlock,
  ManualBlockTrigger,
  PrivateMempool,
} from "@proto-kit/sequencer";
import { AppChain, InMemorySigner } from "@proto-kit/sdk";
import { MethodIdResolver } from "@proto-kit/module";
import chalk from "chalk";
import Table from "cli-table";
import figlet from "figlet";
import ansiEscapes from "ansi-escapes";
import gradient from "gradient-string";
import { exit } from "process";

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
export const gqlUrl = "http://localhost:8080/graphql";

const chainState: ChainState = {
  blocks: [],
  isProducingBlock: false,
  isStarted: false,
  blockTime,
};

function showWelcome() {
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
      table.push(["GraphiQL URL", `${gqlUrl}`]);
      console.log(table.toString());
    }
  );
}

async function produceBlock(trigger: ManualBlockTrigger) {
  return await trigger.produceUnproven();
}

async function startChain({ configFile }: { configFile: string }) {
  // remove starting "." if present from configFile
  const path =
    process.cwd() +
    (configFile.startsWith("./") ? configFile.slice(1) : configFile);
  appChain = (await import(path)).default;
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
  let blockHeight = 0;
  let blockGenerationTime = 0;
  let Looper = async () => {
    chainState.isProducingBlock = true;
    const startTime = Date.now();
    try {
      const unprovenBlock = await produceBlock(trigger);
      blockHeight++;
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
    } catch (e: any) {
      process.stdout.write(ansiEscapes.eraseEndLine);
      console.log(
        `[${chalk.gray(
          new Date().toLocaleTimeString()
        )}] Block #${blockHeight} (${chalk.gray(blockGenerationTime)}ms)\n`
      );
      console.error(e);
    }
    setTimeout(Looper, blockTime - blockGenerationTime);
  };
  Looper();
  displayChainStats(mempool);
}

export function printBlockDetails(
  unprovenBlock: UnprovenBlock | undefined,
  blockHeight: number,
  blockGenerationTime: number,
  methodIdResolver: MethodIdResolver
) {
  const txnCount = unprovenBlock?.transactions?.length || 0;
  process.stdout.write(ansiEscapes.eraseEndLine);
  let str = `[${chalk.gray(new Date().toLocaleTimeString())}]`;
  str += ` Block #${chalk.whiteBright(blockHeight)}`;
  str += `\t${chalk.gray(`took ${blockGenerationTime}ms`)}`;
  str += ` ${chalk.gray(`(${txnCount} txns)`)}`;
  process.stdout.write(str);
  process.stdout.write(ansiEscapes.eraseEndLine);
  process.stdout.write(ansiEscapes.cursorNextLine);
  if (unprovenBlock?.transactions) {
    for (let i = 0; i < txnCount; i++) {
      const txn = unprovenBlock.transactions[i];
      const name = methodIdResolver.getMethodNameFromId(
        txn.tx.methodId.toBigInt()
      );
      let str = `  ${chalk.gray("tx:") + i}`;
      // add method name
      if (name) {
        str += ` ${chalk.gray("method:")} ${chalk.bold.cyan(
          name[0] + "." + name[1]
        )}`;
      } else {
        str += ` ${chalk.gray("method:")} ${chalk.redBright("unresolved")}`;
      }
      // add txn hash
      str += ` ${chalk.gray("hash:")} 0x${txn.tx
        .hash()
        .toBigInt()
        .toString(16)}`;
      process.stdout.write(str);
      process.stdout.write(ansiEscapes.eraseEndLine);
      process.stdout.write(ansiEscapes.cursorNextLine);
      // add status
      if (txn.status.toBoolean()) {
        str = `  ${chalk.gray("status:")}✅`;
      } else {
        str = `  ${chalk.gray("status:")}❌`;
        str += ` ${chalk.gray("statusMessage:")} ${chalk.redBright.bold(
          txn.statusMessage
        )}`;
        // process.stdout.write(ansiEscapes.eraseEndLine);
      }
      process.stdout.write(str);
      process.stdout.write(ansiEscapes.eraseEndLine);
      process.stdout.write(ansiEscapes.cursorNextLine);
    }
  }
}

async function displayChainStats(mempool: PrivateMempool) {
  setInterval(async () => {
    const pendingTxns = await mempool.getTxs();
    const remaining = Math.floor(
      Math.max(0, (chainState.nextTrigger || 0) - Date.now()) / 1000
    );

    let table = new Table({});
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

export async function start(argv: { configFile: string; blockTime: number }) {
  blockTime = argv.blockTime * 1000;
  showWelcome();
  startChain(argv);
}

const handleExit = () => {
  process.stdout.write(ansiEscapes.cursorShow);
  exit();
};
process.on("SIGINT", () => {
  handleExit();
});
