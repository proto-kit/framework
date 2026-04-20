import {
  Block,
  BlockQueue,
  BlockStorage,
  task,
  Task,
  TaskSerializer,
  TaskWorkerModule,
  TransactionStorage,
} from "@proto-kit/sequencer";
import { log } from "@proto-kit/common";
import { inject, injectable } from "tsyringe";

import {
  IndexBlockTaskParameters,
  IndexBlockTaskParametersSerializer,
} from "./IndexBlockTaskParameters";

export type IndexBlockResult =
  | { status: "ok" }
  | {
      status: "missing-blocks";
      missingHeights: number[];
    };

@injectable()
@task()
export class IndexBlockTask
  extends TaskWorkerModule
  implements Task<IndexBlockTaskParameters[], IndexBlockResult>
{
  public name = "index-block";

  public constructor(
    public taskSerializer: IndexBlockTaskParametersSerializer,
    @inject("BlockQueue")
    public blockStorage: BlockQueue,
    @inject("BlockStorage")
    private readonly blockRepository: BlockStorage,
    @inject("TransactionStorage")
    public transactionStorage: TransactionStorage
  ) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public async prepare(): Promise<void> {}

  private async syncTransactions(block: Block) {
    const results = await Promise.all(
      block.transactions.map(async ({ tx }) => {
        return [
          tx,
          await this.transactionStorage.findTransaction(tx.hash().toString()),
        ] as const;
      })
    );

    const missingTxs = results
      .filter(([, result]) => result === undefined)
      .map(([tx]) => tx);

    const pushResults = await Promise.all(
      missingTxs.map(
        async (tx) => await this.transactionStorage.pushUserTransaction(tx, 0)
      )
    );
    if (pushResults.some((x) => !x)) {
      log.error(
        "Some transactions haven't been pushed, this will lead to constraint errors!"
      );
    }
  }

  public async compute(
    input: IndexBlockTaskParameters[]
  ): Promise<IndexBlockResult> {
    // We have two scenarios here:
    // - In normal indexing, we only receive a single block.
    // - If we receive multiple blocks, it means we’re indexing missing blocks
    // that were generated using Array.from()
    // Therefore, the incoming input array will always be in-order
    const firstBlockHeight = Number(input[0].block.height.toBigInt());

    try {
      const currentHeight = await this.blockRepository.getCurrentBlockHeight();

      // We rely on the block storage to enforce some sort of internal consistency
      // i.e. it throws an error when we try to insert a block whose parent isn't
      // stored yet. Therefore, we can rely on the height indicating that all
      // previous blocks are existent - so we only check for that here
      if (firstBlockHeight > currentHeight) {
        const missingHeights = Array.from(
          { length: firstBlockHeight - currentHeight + 1 },
          (_, i) => currentHeight + i
        );
        return { status: "missing-blocks", missingHeights };
      }

      for (const blockWithResult of input) {
        const height = Number(blockWithResult.block.height.toBigInt());
        // eslint-disable-next-line no-await-in-loop
        await this.syncTransactions(blockWithResult.block);
        // eslint-disable-next-line no-await-in-loop
        await this.blockStorage.pushBlock(blockWithResult.block);
        // eslint-disable-next-line no-await-in-loop
        await this.blockStorage.pushResult(blockWithResult.result);
        log.info(`Block ${height} indexed successfully`);
      }

      return { status: "ok" };
    } catch (error) {
      log.error("Failed to index block", firstBlockHeight, error);
      return { status: "ok" };
    }
  }

  public inputSerializer(): TaskSerializer<IndexBlockTaskParameters[]> {
    return {
      toJSON: (blocks: IndexBlockTaskParameters[]): string =>
        JSON.stringify(blocks.map((b) => this.taskSerializer.toJSON(b))),

      fromJSON: (json: string): IndexBlockTaskParameters[] => {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const items = JSON.parse(json) as string[];
        return items.map((item) => this.taskSerializer.fromJSON(item));
      },
    };
  }

  public resultSerializer(): TaskSerializer<IndexBlockResult> {
    return {
      toJSON: async (input: IndexBlockResult) => JSON.stringify(input),

      fromJSON: async (json: string) =>
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        JSON.parse(json) as IndexBlockResult,
    };
  }
}
