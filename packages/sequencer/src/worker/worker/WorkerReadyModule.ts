import { inject, injectable } from "tsyringe";

import { WorkerModule } from "./WorkerModule";

/**
 * Module to safely wait for the finish of the worker startup
 * Behaves like a noop for non-worker appchain configurations
 */
@injectable()
export class WorkerReadyModule {
  public constructor(
    @inject("WorkerModule", { isOptional: true })
    private readonly workerModule: WorkerModule<any> | undefined
  ) {}

  // eslint-disable-next-line consistent-return
  public async waitForReady() {
    if (this.workerModule !== undefined) {
      const module = this.workerModule;
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
