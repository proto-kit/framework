import {
  Task,
  TaskSerializer,
  TaskWorkerModule,
  Settlement,
  SettlementStorage,
  JSONTaskSerializer,
} from "@proto-kit/sequencer";
import { inject, injectable } from "tsyringe";
import { log } from "@proto-kit/common";

@injectable()
export class IndexSettlementTask
  extends TaskWorkerModule
  implements Task<Settlement, string | void>
{
  public name = "index-settlement";

  public constructor(
    @inject("SettlementStorage")
    public settlementStorage: SettlementStorage
  ) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public async prepare(): Promise<void> {}

  public async compute(input: Settlement): Promise<string | void> {
    try {
      await this.settlementStorage.pushSettlement(input);
      return "";
    } catch (err) {
      log.error("Failed to process settlement task", err);
      return undefined;
    }
  }

  public inputSerializer(): TaskSerializer<Settlement> {
    return JSONTaskSerializer.fromType<Settlement>();
  }

  public resultSerializer(): TaskSerializer<string | void> {
    return {
      fromJSON: async () => {},
      toJSON: async () => "",
    };
  }
}
