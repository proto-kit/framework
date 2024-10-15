import { injectable } from "tsyringe";
import { log } from "@proto-kit/common";

import { Closeable } from "./queue/TaskQueue";
import { FlowCreator } from "./flow/Flow";
import {
  WorkerRegistrationTask,
  WorkerStartupPayload,
} from "./worker/startup/WorkerRegistrationTask";

@injectable()
export class WorkerRegistrationFlow implements Closeable {
  public constructor(
    private readonly flowCreator: FlowCreator,
    private readonly task: WorkerRegistrationTask
  ) {}

  flow?: Closeable;

  public async start(payload: WorkerStartupPayload): Promise<void> {
    const flow = this.flowCreator.createFlow("register-worker-flow", {});
    this.flow = flow;

    const loop = async () => {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        // eslint-disable-next-line no-await-in-loop
        await flow.withFlow(async (res, rej) => {
          log.trace("Pushing registration task");
          await flow.pushTask(this.task, payload, async (result) => {
            // Here someone could inject things to happen when the worker registers
            res(result);
          });
        });
      }
    };

    void loop();
  }

  public async close() {
    await this.flow?.close();
  }
}
