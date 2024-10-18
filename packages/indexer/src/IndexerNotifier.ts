import {
  BlockTriggerBase,
  Sequencer,
  sequencerModule,
  SequencerModule,
  TaskPayload,
  TaskQueue,
} from "@proto-kit/sequencer";
import { log } from "@proto-kit/common";
import { inject } from "tsyringe";

import { IndexBlockTask } from "./tasks/IndexBlockTask";

export type NotifierMandatorySequencerModules = {
  BlockTrigger: typeof BlockTriggerBase;
};

@sequencerModule()
export class IndexerNotifier extends SequencerModule<Record<never, never>> {
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
    const queue = await this.taskQueue.getQueue(this.indexBlockTask.name);
    const inputSerializer = this.indexBlockTask.inputSerializer();

    this.sequencer.events.on("block-metadata-produced", async (block) => {
      log.debug(
        "Notifiying the indexer about block",
        block.block.height.toBigInt()
      );
      const payload = await inputSerializer.toJSON(block);

      const task: TaskPayload = {
        name: this.indexBlockTask.name,
        payload,
        flowId: "", // empty for now
      };

      await queue.addTask(task);
    });
  }

  public async start(): Promise<void> {
    await this.propagateEventsAsTasks();
  }
}
