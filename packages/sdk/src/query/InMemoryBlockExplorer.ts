import { inject, injectable } from "tsyringe";
import {
  AppChainModule,
  Block,
  BlockExplorer,
  BlockStorage,
  TransactionStorage,
} from "@proto-kit/sequencer";
import { BlockModel, InclusionStatus } from "@proto-kit/api";
import { sleep } from "@proto-kit/common";

@injectable()
export class InMemoryBlockExplorer
  extends AppChainModule
  implements BlockExplorer {
    public constructor(
    @inject("TransactionStorage")
    private readonly transactionStorage: TransactionStorage,
    @inject("BlockStorage")
    private readonly blockStorage: BlockStorage
  ) {
    super();
  }

  public async waitTxInclusion(
    txHash: string,
    interval = 1000,
    attempts = 5
  ): Promise<{ transactionState: InclusionStatus }> {
    let remainingAttempts = attempts;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const dbTx = await this.transactionStorage.findTransaction(txHash);

      if (dbTx?.block !== undefined) {
        return { transactionState: InclusionStatus.INCLUDED };
      }

      if (dbTx !== undefined) {
        return { transactionState: InclusionStatus.PENDING };
      }

      if (remainingAttempts <= 0) {
        return { transactionState: InclusionStatus.UNKNOWN };
      }

      remainingAttempts -= 1;
      // eslint-disable-next-line no-await-in-loop
      await sleep(interval);
    }
  }

  public async getBlock(
    hash: string | undefined,
    height: number | undefined
  ): Promise<BlockModel | undefined> {
    let block: Block | undefined;

    if (hash !== undefined) {
      block = await this.blockStorage.getBlock(hash);
    } else {
      const blockHeight =
        height ?? (await this.blockStorage.getCurrentBlockHeight()) - 1;
      block = await this.blockStorage.getBlockAt(blockHeight);
    }

    if (block !== undefined) {
      return BlockModel.fromServiceLayerModel(block);
    }

    return undefined;
  }
}
