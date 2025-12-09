import { PendingTransaction } from "@proto-kit/sequencer";
import { TransactionMapper } from "@proto-kit/persistance";
import { injectable } from "tsyringe";

@injectable()
export class IndexPendingTxTaskParametersSerializer {
  public constructor(public transactionMapper: TransactionMapper) {}

  public toJSON(parameters: PendingTransaction): string {
    return JSON.stringify(this.transactionMapper.mapOut(parameters));
  }

  public fromJSON(json: string): PendingTransaction {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const parsed = JSON.parse(json) as ReturnType<TransactionMapper["mapOut"]>;
    return this.transactionMapper.mapIn(parsed);
  }
}
