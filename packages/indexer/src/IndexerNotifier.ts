import {
  BlockTriggerBase,
  BlockStorage,
  BlockWithResult,
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

import { IndexBlockTask, IndexBlockResult } from "./tasks/IndexBlockTask";
import { IndexMissingBlocksTask } from "./tasks/IndexMissingBlocksTask";
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
    @inject("BlockStorage")
    private readonly blockStorage: BlockStorage,
    public indexBlockTask: IndexBlockTask,
    public indexMissingBlocksTask: IndexMissingBlocksTask,
    public indexPendingTxTask: IndexPendingTxTask,
    public indexBatchTask: IndexBatchTask,
    public indexSettlementTask: IndexSettlementTask,
    private readonly sequencerIdProvider: SequencerIdProvider
  ) {
    super();
  }

  private async pushTask(
    queueName: string,
    name: string,
    payload: string
  ): Promise<void> {
    const queue = await this.taskQueue.getQueue(queueName);
    await queue.addTask({
      name,
      payload,
      flowId: "",
      sequencerId: this.sequencerIdProvider.getSequencerId(),
    });
  }

  private async handleIndexBlockTaskCompleted(
    payload: TaskPayload
  ): Promise<void> {
    if (payload.name !== this.indexBlockTask.name) {
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const result = JSON.parse(payload.payload) as IndexBlockResult;

      if (
        result.status !== "missing-blocks" ||
        result.missingHeights.length === 0
      ) {
        return;
      }

      const heights = [...result.missingHeights, result.incomingHeight];

      const blocks = await Promise.all(
        heights.map((h) => this.blockStorage.getBlockWithResultAt(h))
      );

      const filteredBlocks = blocks.filter(
        (block): block is BlockWithResult => block !== undefined
      );

      if (filteredBlocks.length === 0) {
        log.warn("No blocks found to re-send");
        return;
      }

      const serialized = await this.indexMissingBlocksTask
        .inputSerializer()
        .toJSON(filteredBlocks);

      await this.pushTask(
        this.indexMissingBlocksTask.name,
        this.indexMissingBlocksTask.name,
        serialized
      );
    } catch (error) {
      log.error("Failed to handle block task completion result", error);
    }
  }

  public async propagateEventsAsTasks() {
    const queue = await this.taskQueue.getQueue(this.indexBlockTask.name);
    const inputSerializer = this.indexBlockTask.inputSerializer();
    const txInputSerializer = this.indexPendingTxTask.inputSerializer();
    const batchInputSerializer = this.indexBatchTask.inputSerializer();
    const settlementInputSerializer =
      this.indexSettlementTask.inputSerializer();

    await queue.onCompleted(
      async (payload) => await this.handleIndexBlockTaskCompleted(payload)
    );

    this.sequencer.events.on("block-metadata-produced", async (block) => {
      log.debug(
        "Notifiying the indexer about block",
        block.block.height.toBigInt()
      );
      const payload = await inputSerializer.toJSON(block);
      await this.pushTask(
        this.indexBlockTask.name,
        this.indexBlockTask.name,
        payload
      );
    });

    this.sequencer.events.on("mempool-transaction-added", async (tx) => {
      try {
        const payload = await txInputSerializer.toJSON(tx);
        await this.pushTask(
          this.indexPendingTxTask.name,
          this.indexPendingTxTask.name,
          payload
        );
      } catch (err) {
        log.error("Failed to add pending-tx task", err);
      }
    });

    this.sequencer.events.on("batch-produced", async (batch) => {
      log.debug("Notifiying the indexer about batch", batch?.height);
      try {
        const payload = await batchInputSerializer.toJSON(batch);
        await this.pushTask(
          this.indexBatchTask.name,
          this.indexBatchTask.name,
          payload
        );
      } catch (err) {
        log.error(`Failed to index batch ${batch?.height} ${err}`);
      }
    });

    this.sequencer.events.on("settlement-submitted", async (settlement) => {
      log.debug(
        "Notifying the indexer about settlement",
        settlement.transactionHash
      );
      try {
        const payload = await settlementInputSerializer.toJSON(settlement);
        await this.pushTask(
          this.indexSettlementTask.name,
          this.indexSettlementTask.name,
          payload
        );
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
