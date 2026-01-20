import {
  BlockQueue,
  JSONTaskSerializer,
  Task,
  TaskSerializer,
  TaskWorkerModule,
} from "@proto-kit/sequencer";
import { log } from "@proto-kit/common";
import { inject, injectable } from "tsyringe";

import { IndexBlockTaskParameters } from "./IndexBlockTaskParameters";

@injectable()
export class IndexBlockTask
  extends TaskWorkerModule
  implements Task<IndexBlockTaskParameters, string | void>
{
  public name = "index-block";

  public constructor(
    @inject("BlockQueue")
    public blockStorage: BlockQueue
  ) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public async prepare(): Promise<void> {}

  public async compute(
    input: IndexBlockTaskParameters
  ): Promise<string | void> {
    try {
      await this.blockStorage.pushBlock(input.block);
      await this.blockStorage.pushResult(input.result);
    } catch (error) {
      log.error("Failed to index block", input.block.height, error);
      return;
    }

    log.info(`Block ${input.block.height} indexed sucessfully`);
  }

  public inputSerializer(): TaskSerializer<IndexBlockTaskParameters> {
    return JSONTaskSerializer.fromType<IndexBlockTaskParameters>();
  }

  public resultSerializer(): TaskSerializer<string | void> {
    return {
      fromJSON: async () => {},
      toJSON: async () => "",
    };
  }
}
