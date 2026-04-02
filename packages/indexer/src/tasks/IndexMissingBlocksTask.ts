import {
  BlockQueue,
  BlockWithResult,
  Task,
  TaskSerializer,
  TaskWorkerModule,
} from "@proto-kit/sequencer";
import { log } from "@proto-kit/common";
import { inject, injectable } from "tsyringe";

import { IndexBlockTaskParametersSerializer } from "./IndexBlockTaskParameters";

@injectable()
export class IndexMissingBlocksTask
  extends TaskWorkerModule
  implements Task<BlockWithResult[], string | void>
{
  public name = "index-missing-blocks";

  public constructor(
    public taskSerializer: IndexBlockTaskParametersSerializer,
    @inject("BlockQueue")
    public blockStorage: BlockQueue
  ) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public async prepare(): Promise<void> {}

  public async compute(input: BlockWithResult[]): Promise<string | void> {
    const lastHeight = Number(input[input.length - 1].block.height.toBigInt());
    for (const blockWithResult of input) {
      const height = Number(blockWithResult.block.height.toBigInt());
      const isLast = height === lastHeight;
      try {
        // eslint-disable-next-line no-await-in-loop
        await this.blockStorage.pushBlock(blockWithResult.block);
        // eslint-disable-next-line no-await-in-loop
        await this.blockStorage.pushResult(blockWithResult.result);
        log.info(
          `${isLast ? "" : "Missing "}block ${height} indexed successfully`
        );
      } catch (error) {
        log.error(
          `Failed to index ${isLast ? "" : "missing "}block at height ${height}`,
          error
        );
        return undefined;
      }
    }
    return "";
  }

  public inputSerializer(): TaskSerializer<BlockWithResult[]> {
    return {
      toJSON: (blocks: BlockWithResult[]): string =>
        JSON.stringify(blocks.map((b) => this.taskSerializer.toJSON(b))),

      fromJSON: (json: string): BlockWithResult[] => {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const items = JSON.parse(json) as string[];
        return items.map((item) => this.taskSerializer.fromJSON(item));
      },
    };
  }

  public resultSerializer(): TaskSerializer<string | void> {
    return {
      fromJSON: async () => {},
      toJSON: async () => "",
    };
  }
}
