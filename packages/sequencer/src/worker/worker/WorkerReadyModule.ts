import { injectable } from "tsyringe";
import { injectOptional } from "@proto-kit/common";

import { SequencerStartupModule } from "../../sequencer/SequencerStartupModule";

import { LocalTaskWorkerModule } from "./LocalTaskWorkerModule";

/**
 * Module to safely wait for the finish of the worker startup
 * Behaves like a noop for non-worker appchain configurations
 */
@injectable()
export class WorkerReadyModule {
  public constructor(
    @injectOptional("LocalTaskWorkerModule")
    private readonly localTaskWorkerModule:
      | LocalTaskWorkerModule<any>
      | undefined,
    @injectOptional("SequencerStartupModule")
    private readonly sequencerStartupModule: SequencerStartupModule | undefined
  ) {
    if (
      localTaskWorkerModule !== undefined &&
      sequencerStartupModule === undefined
    ) {
      throw new Error(
        "The LocalTaskWorkerModule requires the SequencerStartupModule to be defined as well."
      );
    }
  }

  // eslint-disable-next-line consistent-return
  public async waitForReady() {
    if (this.localTaskWorkerModule !== undefined) {
      const module = this.localTaskWorkerModule;
      return await new Promise<void>((res, rej) => {
        module.containerEvents.on("ready", (ready) => {
          if (ready) {
            res();
          } else {
            rej(new Error("Couldn't get ready"));
          }
        });
      });
    }
  }
}
