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

export interface IndexBlockResult {
  status: "ok" | "missing-blocks";
  missingHeights: number[];
  incomingHeight: number;
}

@injectable()
export class IndexBlockTask
  extends TaskWorkerModule
  implements Task<IndexBlockTaskParameters, IndexBlockResult>
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
    input: IndexBlockTaskParameters
  ): Promise<IndexBlockResult> {
    const incomingHeight = Number(input.block.height.toBigInt());
    try {
      const currentHeight = await this.blockRepository.getCurrentBlockHeight();

      if (incomingHeight > currentHeight) {
        const missingHeights = Array.from(
          { length: incomingHeight - currentHeight },
          (_, i) => currentHeight + i
        );

        return { status: "missing-blocks", missingHeights, incomingHeight };
      }
      await this.blockStorage.pushBlock(input.block);
      await this.blockStorage.pushResult(input.result);

      log.info(`Block ${incomingHeight} indexed successfully`);
      return { status: "ok", missingHeights: [], incomingHeight };
    } catch (error) {
      log.error("Failed to index block", incomingHeight, error);
      return { status: "ok", missingHeights: [], incomingHeight };
    }
  }

  public inputSerializer(): TaskSerializer<IndexBlockTaskParameters> {
    return this.taskSerializer;
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
