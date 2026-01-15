import { PendingTransactionJSONType } from "@proto-kit/sequencer";
import { TransactionMapper } from "@proto-kit/persistance";
import { injectable } from "tsyringe";

@injectable()
export class IndexPendingTxTaskParametersSerializer {
  public constructor(public transactionMapper: TransactionMapper) {}

  public toJSON(parameters: PendingTransactionJSONType): string {
    return JSON.stringify({
      tx: this.transactionMapper.mapOut(parameters),
    });
  }

  public fromJSON(json: string): PendingTransactionJSONType {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const parsed = JSON.parse(json) as {
      tx: ReturnType<TransactionMapper["mapOut"]>;
    };
    return this.transactionMapper.mapIn(parsed.tx);
  }
}
