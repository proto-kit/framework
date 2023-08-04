import { inject } from "tsyringe";
import { noop, Protocol, ProtocolModulesRecord } from "@proto-kit/protocol";

import {
  sequencerModule,
  SequencerModule,
} from "../../sequencer/builder/SequencerModule";
import { TaskQueue } from "../queue/TaskQueue";
import {
  BlockProvingTask,
  RuntimeProvingTask,
  StateTransitionTask,
} from "../../protocol/production/tasks/BlockProvingTask";

import { TaskWorker } from "./TaskWorker";

/**
 * This module spins up a worker in the current local node instance.
 * This should only be used for local testing/development and not in a
 * production setup. Use the proper worker execution method for spinning up
 * cloud workers.
 */
@sequencerModule()
export class LocalTaskWorkerModule extends SequencerModule<object> {
  public constructor(
    @inject("TaskQueue") private readonly taskQueue: TaskQueue,
    private readonly stateTransitionTask: StateTransitionTask,
    private readonly runtimeProvingTask: RuntimeProvingTask,
    private readonly blockProvingTask: BlockProvingTask,
    @inject("Protocol")
    private readonly protocol: Protocol<ProtocolModulesRecord>
  ) {
    super();
  }

  public async start(): Promise<void> {
    const worker = new TaskWorker(this.taskQueue);
    worker.addMapTask("block", this.stateTransitionTask);
    worker.addMapTask("block", this.runtimeProvingTask);
    worker.addMapReduceTask("block", this.blockProvingTask);
    worker
      .start()
      // eslint-disable-next-line max-len
      // eslint-disable-next-line promise/prefer-await-to-then,promise/always-return
      .then(() => {
        noop();
      })
      // eslint-disable-next-line max-len
      // eslint-disable-next-line promise/prefer-await-to-then,etc/no-implicit-any-catch
      .catch((error: Error) => {
        console.error(error);
      });
  }
}
