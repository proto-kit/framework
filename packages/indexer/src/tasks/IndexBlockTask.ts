import {
  BlockQueue,
  BlockStorage,
  Task,
  TaskSerializer,
  TaskWorkerModule,
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
    private readonly blockRepository: BlockStorage
  ) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public async prepare(): Promise<void> {}

  public async compute(
    input: IndexBlockTaskParameters[]
  ): Promise<IndexBlockResult> {
    const firstBlockHeight = Number(input[0].block.height.toBigInt());

    try {
      const currentHeight = await this.blockRepository.getCurrentBlockHeight();

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
