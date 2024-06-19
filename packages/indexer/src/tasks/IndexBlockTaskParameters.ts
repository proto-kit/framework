import { UnprovenBlockWithMetadata } from "@proto-kit/sequencer";
import {
  BlockMapper,
  TransactionExecutionResultMapper,
  UnprovenBlockMetadataMapper,
} from "@proto-kit/persistance";
import { injectable } from "tsyringe";

@injectable()
export class IndexBlockTaskParametersSerializer {
  public constructor(
    public blockMapper: BlockMapper,
    public blockMetadataMapper: UnprovenBlockMetadataMapper,
    public transactionResultMapper: TransactionExecutionResultMapper
  ) {}

  public toJSON(parameters: UnprovenBlockWithMetadata): string {
    return JSON.stringify({
      block: this.blockMapper.mapOut(parameters.block),
      transactions: parameters.block.transactions.map((tx) =>
        this.transactionResultMapper.mapOut(tx)
      ),
      metadata: this.blockMetadataMapper.mapOut(parameters.metadata),
    });
  }

  public fromJSON(json: string): UnprovenBlockWithMetadata {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const parsed = JSON.parse(json) as {
      block: ReturnType<BlockMapper["mapOut"]>;
      transactions: ReturnType<TransactionExecutionResultMapper["mapOut"]>[];
      metadata: ReturnType<UnprovenBlockMetadataMapper["mapOut"]>;
    };

    const transactions = parsed.transactions.map((tx) =>
      this.transactionResultMapper.mapIn(tx)
    );

    const metadata = this.blockMetadataMapper.mapIn(parsed.metadata);

    return {
      block: {
        ...this.blockMapper.mapIn(parsed.block),
        transactions,
      },
      metadata,
    };
  }
}
