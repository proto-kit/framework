import "reflect-metadata";

import { setBackend } from "o1js";
// eslint-disable-next-line import/no-extraneous-dependencies
import { BullQueue } from "@proto-kit/deployment";
import { container } from "tsyringe";
import { log, sleep } from "@proto-kit/common";

import {
  AppChain,
  LocalTaskWorkerModule,
  Sequencer,
  VanillaTaskWorkerModules,
} from "../../src";

import {
  BullConfig,
  protocolClass,
  runtimeClass,
  runtimeProtocolConfig,
} from "./modules";
import { MinimumWorkerModules } from "./WorkerModules";

setBackend("native");

/* eslint-disable no-console */
async function main() {
  const proofsEnabled = process.env.PROOFS_ENABLED === "true";

  const sequencerClass = Sequencer.from({
    TaskQueue: BullQueue,
    LocalTaskWorkerModule: LocalTaskWorkerModule.from(
      VanillaTaskWorkerModules.withoutSettlement()
    ),
  } satisfies MinimumWorkerModules);

  const app = AppChain.from({
    Runtime: runtimeClass,
    Sequencer: sequencerClass,
    Protocol: protocolClass,
  });

  app.configure({
    ...runtimeProtocolConfig,
    Sequencer: {
      TaskQueue: BullConfig,
      LocalTaskWorkerModule: VanillaTaskWorkerModules.defaultConfig(),
    },
  });

  console.log("Starting worker...");
  console.log(`Worker proofs enabled: ${proofsEnabled}`);

  log.setLevel("DEBUG");

  await app.start(proofsEnabled, container.createChildContainer());

  console.log("Worker started...");

  const ready = await new Promise<boolean>((res) => {
    app
      .resolve("Sequencer")
      .resolve("LocalTaskWorkerModule")
      .containerEvents.on("ready", res);
  });

  expect(ready).toBe(true);

  console.log("Ready received!");

  await sleep(10000000);
}

const isSpawned = process.env.IS_SPAWNED_PROCESS === "true";

if (isSpawned) {
  await main();
}
/* eslint-enable no-console */
