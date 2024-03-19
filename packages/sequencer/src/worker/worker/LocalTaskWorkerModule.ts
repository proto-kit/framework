import { inject } from "tsyringe";
import {
  MandatoryProtocolModulesRecord,
  Protocol,
  ProtocolModulesRecord,
} from "@proto-kit/protocol";
import { noop } from "@proto-kit/common";

import {
  sequencerModule,
  SequencerModule,
} from "../../sequencer/builder/SequencerModule";
import { SettlementProvingTask } from "../../settlement/tasks/SettlementProvingTask";
import { TaskQueue } from "../queue/TaskQueue";
import {
  BlockProvingTask,
  BlockReductionTask,
} from "../../protocol/production/tasks/BlockProvingTask";
import {
  StateTransitionReductionTask,
  StateTransitionTask,
} from "../../protocol/production/tasks/StateTransitionTask";
import { RuntimeProvingTask } from "../../protocol/production/tasks/RuntimeProvingTask";
import { NewBlockTask } from "../../protocol/production/tasks/NewBlockTask";

import { FlowTaskWorker } from "./FlowTaskWorker";

/**
 * This module spins up a worker in the current local node instance.
 * This should only be used for local testing/development and not in a
 * production setup. Use the proper worker execution method for spinning up
 * cloud workers.
 */
@sequencerModule()
export class LocalTaskWorkerModule extends SequencerModule {
  // eslint-disable-next-line max-params
  public constructor(
    @inject("TaskQueue") private readonly taskQueue: TaskQueue,
    private readonly stateTransitionTask: StateTransitionTask,
    private readonly stateTransitionReductionTask: StateTransitionReductionTask,
    private readonly runtimeProvingTask: RuntimeProvingTask,
    private readonly blockProvingTask: BlockProvingTask,
    private readonly blockReductionTask: BlockReductionTask,
    private readonly blockBuildingTask: NewBlockTask,
    // private readonly settlementProvingTask: SettlementProvingTask,
    @inject("Protocol")
    private readonly protocol: Protocol<
      MandatoryProtocolModulesRecord & ProtocolModulesRecord
    >
  ) {
    super();
  }

  public async start(): Promise<void> {
    const worker = new FlowTaskWorker(this.taskQueue, [
      this.stateTransitionTask,
      this.stateTransitionReductionTask,
      this.runtimeProvingTask,
      this.blockProvingTask,
      this.blockReductionTask,
      this.blockBuildingTask,
      // this.settlementProvingTask,
    ]);
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
