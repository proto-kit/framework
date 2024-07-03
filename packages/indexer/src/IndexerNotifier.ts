import {
  BlockTriggerBase,
  Sequencer,
  sequencerModule,
  SequencerModule,
  TaskPayload,
  TaskQueue,
} from "@proto-kit/sequencer";
import { inject } from "tsyringe";

import { IndexBlockTask } from "./tasks/IndexBlockTask";

export type NotifierMandatorySequencerModules = {
  BlockTrigger: typeof BlockTriggerBase;
};

@sequencerModule()
export class IndexerNotifier extends SequencerModule<Record<never, never>> {
  public static indexerQueueName = "indexer";

  public constructor(
    @inject("Sequencer")
    public sequencer: Sequencer<NotifierMandatorySequencerModules>,
    @inject("TaskQueue")
    public taskQueue: TaskQueue,
    public indexBlockTask: IndexBlockTask
  ) {
    super();
  }

  public async propagateEventsAsTasks() {
    const queue = await this.taskQueue.getQueue(
      IndexerNotifier.indexerQueueName
    );

    const inputSerializer = this.indexBlockTask.inputSerializer();

    this.sequencer.events.on("block-metadata-produced", async (block) => {
      const task: TaskPayload = {
        name: this.indexBlockTask.name,
        payload: await inputSerializer.toJSON(block),
        flowId: "", // empty for now
      };
      queue.addTask(task);
      console.log(
        "notifying block",
        block.block.transactions[0].stateTransitions
      );
    });
  }

  public async start(): Promise<void> {
    this.propagateEventsAsTasks();
  }
}
