import "reflect-metadata";
import { AppChain } from "@proto-kit/sdk";
import { BullQueue } from "@proto-kit/deployment";
import { container } from "tsyringe";
import { log, sleep } from "@proto-kit/common";

import {
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
  it("spin up and wait", async () => {
    const sequencerClass = Sequencer.from({
      modules: {
        TaskQueue: BullQueue,
        LocalTaskWorkerModule: LocalTaskWorkerModule.from(
          VanillaTaskWorkerModules.withoutSettlement()
        ),
      } satisfies MinimumWorkerModules,
    });

    const app = AppChain.from({
      Runtime: runtimeClass,
      Sequencer: sequencerClass,
      Protocol: protocolClass,
      modules: {},
    });

    app.configure({
      ...runtimeProtocolConfig,
      Sequencer: {
        TaskQueue: BullConfig,
        LocalTaskWorkerModule: VanillaTaskWorkerModules.defaultConfig(),
      },
    });

    console.log("Starting worker...");

    log.setLevel("DEBUG");

    await app.start(false, container.createChildContainer());

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
