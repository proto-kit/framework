import {
  BlockQueue,
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

@injectable()
export class IndexBlockTask
  extends TaskWorkerModule
  implements Task<IndexBlockTaskParameters, void>
{
  public name = "index-block";

  public constructor(
    public taskSerializer: IndexBlockTaskParametersSerializer,
    @inject("BlockQueue")
    public blockStorage: BlockQueue
  ) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public async prepare(): Promise<void> {}

  public async compute(input: IndexBlockTaskParameters): Promise<void> {
    try {
      await this.blockStorage.pushBlock(input.block);
      await this.blockStorage.pushResult(input.result);
    } catch (error) {
      log.error("Failed to index block", input.block.height.toBigInt(), error);
      return;
    }

    log.info(`Block ${input.block.height.toBigInt()} indexed sucessfully`);
  }

  public inputSerializer(): TaskSerializer<IndexBlockTaskParameters> {
    return this.taskSerializer;
  }

  public resultSerializer(): TaskSerializer<void> {
    return {
      fromJSON: async () => {},
      toJSON: async () => "",
    };
  }
}
