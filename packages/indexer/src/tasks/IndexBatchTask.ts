import {
  Task,
  TaskSerializer,
  TaskWorkerModule,
  Batch,
  BatchStorage,
  task,
} from "@proto-kit/sequencer";
import { inject, injectable } from "tsyringe";
import { log } from "@proto-kit/common";

@injectable()
@task()
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

      log.info(`Batch ${input.height} indexed successfully`);
      return "";
    } catch (err) {
      log.error("Failed to process settlement task", err);
    }
  }

  public inputSerializer(): TaskSerializer<Batch> {
    return {
      toJSON: (parameter: Batch): string => {
        return JSON.stringify(parameter);
      },
      fromJSON: (parameter: string) => {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        return JSON.parse(parameter) as Batch;
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
