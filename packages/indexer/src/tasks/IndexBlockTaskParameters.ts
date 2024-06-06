import { UnprovenBlock } from "@proto-kit/sequencer";
import {
  BlockMapper,
  TransactionExecutionResultMapper,
} from "@proto-kit/persistance";
import { injectable } from "tsyringe";

@injectable()
export class IndexBlockTaskParametersSerializer {
  public constructor(
    public blockMapper: BlockMapper,
    public transactionResultMapper: TransactionExecutionResultMapper
  ) {}

  public toJSON(parameters: UnprovenBlock): string {
    return JSON.stringify({
      ...this.blockMapper.mapOut(parameters),
      transactions: parameters.transactions.map((tx) =>
        this.transactionResultMapper.mapOut(tx)
      ),
    });
  }

  public fromJSON(json: string): UnprovenBlock {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const parsed = JSON.parse(json) as ReturnType<BlockMapper["mapOut"]> & {
      transactions: ReturnType<TransactionExecutionResultMapper["mapOut"]>[];
    };

    const transactions = parsed.transactions.map((tx) =>
      this.transactionResultMapper.mapIn(tx)
    );

    return {
      ...this.blockMapper.mapIn(parsed),
      transactions,
    };
  }
}
