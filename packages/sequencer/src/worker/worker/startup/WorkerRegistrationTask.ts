import { log, noop } from "@proto-kit/common";
import { inject, injectable } from "tsyringe";
import {
  Protocol,
  RuntimeVerificationKeyRootService,
} from "@proto-kit/protocol";

import { Task } from "../../flow/Task";
import { AbstractStartupTask } from "../../flow/AbstractStartupTask";

import { CloseWorkerError } from "./CloseWorkerError";

export type WorkerStartupPayload = {
  runtimeVerificationKeyRoot: bigint;
};

@injectable()
export class WorkerRegistrationTask
  extends AbstractStartupTask<WorkerStartupPayload, boolean>
  implements Task<WorkerStartupPayload, boolean>
{
  private done = false;

  public constructor(
    @inject("Protocol") private readonly protocol: Protocol<any>
  ) {
    super();
  }

  public name = "worker-registration";

  public async prepare() {
    noop();
  }

  public async compute(input: WorkerStartupPayload) {
    if (this.done) {
      log.info("Done, trying to close worker");
      throw new CloseWorkerError("Already started");
    }

    const rootService = this.protocol.dependencyContainer.resolve(
      RuntimeVerificationKeyRootService
    );
    rootService.setRoot(input.runtimeVerificationKeyRoot);

    this.events.emit("startup-task-finished");

    this.done = true;
    return true;
  }

  public inputSerializer() {
    return {
      toJSON: (payload: WorkerStartupPayload) => {
        return JSON.stringify({
          runtimeVerificationKeyRoot:
            payload.runtimeVerificationKeyRoot.toString(),
        });
      },
      fromJSON: (payload: string) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const jsonObject = JSON.parse(payload);

        return {
          runtimeVerificationKeyRoot: BigInt(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            jsonObject.runtimeVerificationKeyRoot
          ),
        };
      },
    };
  }

  public resultSerializer() {
    return {
      toJSON: (payload: boolean) => String(payload),
      fromJSON: (payload: string) => Boolean(payload),
    };
  }
}
