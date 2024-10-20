import { BlockWithResult } from "@proto-kit/sequencer";
import {
  BlockMapper,
  BlockResultMapper,
  TransactionExecutionResultMapper,
} from "@proto-kit/persistance";
import { injectable } from "tsyringe";

export interface IndexBlockTaskParameters extends BlockWithResult {}

@injectable()
export class IndexBlockTaskParametersSerializer {
  public constructor(
    public blockMapper: BlockMapper,
    public blockResultMapper: BlockResultMapper,
    public transactionResultMapper: TransactionExecutionResultMapper
  ) {}

  public toJSON(parameters: IndexBlockTaskParameters): string {
    return JSON.stringify({
      block: this.blockMapper.mapOut(parameters.block),
      transactions: parameters.block.transactions.map((tx) =>
        this.transactionResultMapper.mapOut(tx)
      ),
      result: this.blockResultMapper.mapOut(parameters.result),
    });
  }

  public fromJSON(json: string): IndexBlockTaskParameters {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const parsed = JSON.parse(json) as {
      block: ReturnType<BlockMapper["mapOut"]>;
      transactions: ReturnType<TransactionExecutionResultMapper["mapOut"]>[];
      result: ReturnType<BlockResultMapper["mapOut"]>;
    };

    const transactions = parsed.transactions.map((tx) =>
      this.transactionResultMapper.mapIn(tx)
    );

    return {
      block: {
        ...this.blockMapper.mapIn(parsed.block),
        transactions,
      },
      result: this.blockResultMapper.mapIn(parsed.result),
    };
  }
}
