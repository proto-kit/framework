import {
  Block,
  BlockQueue,
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

@injectable()
@task()
export class IndexBlockTask
  extends TaskWorkerModule
  implements Task<IndexBlockTaskParameters, string | void>
{
  public name = "index-block";

  public constructor(
    public taskSerializer: IndexBlockTaskParametersSerializer,
    @inject("BlockQueue")
    public blockStorage: BlockQueue,
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
    input: IndexBlockTaskParameters
  ): Promise<string | void> {
    try {
      await this.syncTransactions(input.block);
      await this.blockStorage.pushBlock(input.block);
      await this.blockStorage.pushResult(input.result);
    } catch (error) {
      log.error("Failed to index block", input.block.height.toBigInt(), error);
      return undefined;
    }

    log.info(`Block ${input.block.height.toBigInt()} indexed successfully`);
    return "";
  }

  public inputSerializer(): TaskSerializer<IndexBlockTaskParameters> {
    return this.taskSerializer;
  }

  public resultSerializer(): TaskSerializer<string | void> {
    return {
      fromJSON: async () => {},
      toJSON: async () => "",
    };
  }
}
