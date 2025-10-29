import "reflect-metadata";
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

describe("worker", () => {
  const isSpawned = process.env.IS_SPAWNED_PROCESS === "true";

  it("spin up and wait", async () => {
    if (!isSpawned) {
      return;
    }

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

    console.log("Ready received!");

    await sleep(10000000);
  }, 10000000);
});
