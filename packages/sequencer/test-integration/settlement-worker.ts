#!/usr/bin/env ts-node

import "reflect-metadata";

// eslint-disable-next-line import/no-extraneous-dependencies
import { BullQueue } from "@proto-kit/deployment";
import { log } from "@proto-kit/common";
import { container } from "tsyringe";
import { Runtime } from "@proto-kit/module";
import { Protocol } from "@proto-kit/protocol";

import {
  protocolModules,
  protocolModulesConfig,
  runtimeModules,
  runtimeModulesConfig,
} from "../test/settlement/Settlement";
import {
  AppChain,
  LocalTaskWorkerModule,
  Sequencer,
  VanillaTaskWorkerModules,
} from "../src";

import { MinimumWorkerModules } from "./workers/WorkerModules";
import { BullConfig } from "./workers/modules";

/* eslint-disable no-console */
async function main() {
  const proofsEnabled = process.env.PROOFS_ENABLED === "true";
  // const settlementEnabled = process.env.SETTLEMENT_ENABLED === "true";

  console.log("Starting worker...");
  console.log(`Worker proofs enabled: ${proofsEnabled}`);
  // console.log(`Worker settlement enabled: ${settlementEnabled}`);

  log.setLevel("DEBUG");

  const sequencerClass = Sequencer.from({
    TaskQueue: BullQueue,
    LocalTaskWorkerModule: LocalTaskWorkerModule.from(
      // settlementEnabled
      VanillaTaskWorkerModules.allTasks()
      // : VanillaTaskWorkerModules.withoutSettlement()
    ),
  } satisfies MinimumWorkerModules);

  const app = AppChain.from({
    Runtime: Runtime.from(runtimeModules),
    Sequencer: sequencerClass,
    Protocol: Protocol.from(protocolModules),
  });

  app.configure({
    Runtime: runtimeModulesConfig,
    Protocol: protocolModulesConfig,
    Sequencer: {
      TaskQueue: BullConfig,
      LocalTaskWorkerModule: VanillaTaskWorkerModules.defaultConfig(),
    },
  });

  log.setLevel("DEBUG");

  await app.start(proofsEnabled, container.createChildContainer());
}

const isSpawned = process.env.IS_SPAWNED_PROCESS === "true";

if (isSpawned) {
  await main();
}
/* eslint-enable no-console */
