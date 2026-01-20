import {
  JSONTaskSerializer,
  PendingTransaction,
  Task,
  TaskSerializer,
  TaskWorkerModule,
  TransactionStorage,
} from "@proto-kit/sequencer";
import { log } from "@proto-kit/common";
import { inject, injectable } from "tsyringe";

@injectable()
export class IndexPendingTxTask
  extends TaskWorkerModule
  implements Task<PendingTransaction, string | void>
{
  public name = "index-pending-tx";

  public constructor(
    @inject("TransactionStorage")
    public transactionStorage: TransactionStorage
  ) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public async prepare(): Promise<void> {}

  public async compute(input: PendingTransaction): Promise<string | void> {
    try {
      await this.transactionStorage.pushUserTransaction(input);
      return "";
    } catch (err) {
      log.error("Failed to process pending tx task", err);
      return undefined;
    }
  }

  public inputSerializer(): TaskSerializer<PendingTransaction> {
    return JSONTaskSerializer.fromType<PendingTransaction>();
  }

  public resultSerializer(): TaskSerializer<string | void> {
    return {
      fromJSON: async () => {},
      toJSON: async () => "",
    };
  }
}
