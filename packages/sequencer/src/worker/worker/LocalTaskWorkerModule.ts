import { inject } from "tsyringe";
import {
  noop,
  Protocol,
  ProtocolModulesRecord,
} from "@yab/protocol";

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

@sequencerModule()
export class LocalTaskWorkerModule extends SequencerModule<{}> {
  public constructor(
    @inject("TaskQueue") private readonly taskQueue: TaskQueue,
    private readonly stateTransitionTask: StateTransitionTask,
    private readonly runtimeProvingTask: RuntimeProvingTask,
    private readonly blockProvingTask: BlockProvingTask,
    @inject("Protocol") private readonly protocol: Protocol<ProtocolModulesRecord>,
  ) {
    super();
  }

  public async start(): Promise<void> {
    const worker = new TaskWorker(this.taskQueue);
    worker.addMapTask("block", this.stateTransitionTask);
    worker.addMapTask("block", this.runtimeProvingTask);
    worker.addMapReduceTask("block", this.blockProvingTask);
    worker.start().then(() => {
      noop();
    });
  }
}
