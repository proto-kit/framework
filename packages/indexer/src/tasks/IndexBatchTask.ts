import {
  Task,
  TaskSerializer,
  TaskWorkerModule,
  Batch,
  BatchStorage,
  JSONTaskSerializer,
} from "@proto-kit/sequencer";
import { inject, injectable } from "tsyringe";
import { log } from "@proto-kit/common";

@injectable()
export class IndexBatchTask
  extends TaskWorkerModule
  implements Task<Batch, string | void>
{
  public name = "index-batch";

  public constructor(
    @inject("BatchStorage")
    public batchStorage: BatchStorage
  ) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public async prepare(): Promise<void> {}

  public async compute(input: Batch): Promise<string | void> {
    try {
      await this.batchStorage.pushBatch(input);
      return "";
    } catch (err) {
      log.error("Failed to process settlement task", err);
      return undefined;
    }
  }

  public inputSerializer(): TaskSerializer<Batch> {
    return JSONTaskSerializer.fromType<Batch>();
  }

  public resultSerializer(): TaskSerializer<string | void> {
    return {
      fromJSON: async () => {},
      toJSON: async () => "",
    };
  }
}
