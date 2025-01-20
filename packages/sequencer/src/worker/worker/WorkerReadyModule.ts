import { injectable } from "tsyringe";
import { injectOptional } from "@proto-kit/common";
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
      | undefined
  ) {}

  public async waitForReady(): Promise<void> {
    if (this.localTaskWorkerModule !== undefined) {
      const module = this.localTaskWorkerModule;
      return new Promise<void>((res, rej) => {
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
