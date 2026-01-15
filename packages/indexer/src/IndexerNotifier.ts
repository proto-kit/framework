import {
  BlockTriggerBase,
  Sequencer,
  sequencerModule,
  SequencerModule,
  TaskPayload,
  TaskQueue,
  SequencerIdProvider,
  PrivateMempool,
  SettlementModule,
} from "@proto-kit/sequencer";
import { log } from "@proto-kit/common";
import { inject } from "tsyringe";

import { IndexBlockTask } from "./tasks/IndexBlockTask";
import { IndexPendingTxTask } from "./tasks/IndexPendingTxTask";
import { IndexSettlementTask } from "./tasks/IndexSettlementTask";
import { IndexBatchTask } from "./tasks/IndexBatchTask";

export type NotifierMandatorySequencerModules = {
  BlockTrigger: typeof BlockTriggerBase;
  Mempool: typeof PrivateMempool;
  SettlementModule: typeof SettlementModule;
};

@sequencerModule()
export class IndexerNotifier extends SequencerModule<Record<never, never>> {
  public constructor(
    @inject("Sequencer")
    public sequencer: Sequencer<NotifierMandatorySequencerModules>,
    @inject("TaskQueue")
    public taskQueue: TaskQueue,
    public indexBlockTask: IndexBlockTask,
    public indexPendingTxTask: IndexPendingTxTask,
    public indexBatchTask: IndexBatchTask,
    public indexSettlementTask: IndexSettlementTask,
    private readonly sequencerIdProvider: SequencerIdProvider
  ) {
    super();
  }

  public async propagateEventsAsTasks() {
    const queue = await this.taskQueue.getQueue(this.indexBlockTask.name);
    const inputSerializer = this.indexBlockTask.inputSerializer();
    const txInputSerializer = this.indexPendingTxTask.inputSerializer();
    const batchInputSerializer = this.indexBatchTask.inputSerializer();
    const settlementInputSerializer =
      this.indexSettlementTask.inputSerializer();

    this.sequencer.events.on("block-metadata-produced", async (block) => {
      log.debug(
        "Notifiying the indexer about block",
        block.block.height.toBigInt()
      );
      const payload = await inputSerializer.toJSON(block);
      const sequencerId = this.sequencerIdProvider.getSequencerId();

      const task: TaskPayload = {
        name: this.indexBlockTask.name,
        payload,
        flowId: "", // empty for now
        sequencerId,
      };

      await queue.addTask(task);
    });
    this.sequencer.events.on("mempool-transaction-added", async (tx) => {
      try {
        const txQueue = await this.taskQueue.getQueue(
          this.indexPendingTxTask.name
        );
        const payload = await txInputSerializer.toJSON(tx);
        const sequencerId = this.sequencerIdProvider.getSequencerId();

        const task: TaskPayload = {
          name: this.indexPendingTxTask.name,
          payload,
          flowId: "",
          sequencerId,
        };

        await txQueue.addTask(task);
      } catch (err) {
        console.error("Failed to add pending-tx task", err);
      }
    });
    this.sequencer.events.on("batch-produced", async (batch) => {
      log.debug("Notifiying the indexer about batch", batch?.height);
      try {
        const batchQueue = await this.taskQueue.getQueue(
          this.indexBatchTask.name
        );

        const payload = await batchInputSerializer.toJSON(batch);
        const sequencerId = this.sequencerIdProvider.getSequencerId();

        const task: TaskPayload = {
          name: this.indexBatchTask.name,
          payload,
          flowId: "",
          sequencerId,
        };

        await batchQueue.addTask(task);
      } catch (err) {
        log.error(`Failed to index batch ${batch?.height} ${err}`);
      }
    });
    this.sequencer.events.on("settlement-submitted", async (settlement) => {
      log.debug(
        "Notifiying the indexer about settlement",
        settlement.transactionHash
      );
      try {
        const settlementQueue = await this.taskQueue.getQueue(
          this.indexSettlementTask.name
        );

        const payload = await settlementInputSerializer.toJSON(settlement);
        const sequencerId = this.sequencerIdProvider.getSequencerId();

        const task: TaskPayload = {
          name: this.indexSettlementTask.name,
          payload,
          flowId: "",
          sequencerId,
        };

        await settlementQueue.addTask(task);
      } catch (err) {
        log.error(
          `Failed to add index settlement: ${settlement.transactionHash} ${err}`
        );
      }
    });
  }

  public async start(): Promise<void> {
    await this.propagateEventsAsTasks();
  }
}
