import { inject, injectable } from "tsyringe";
import {
  AppChainModule,
  Block,
  BlockExplorerTransportModule,
  BlockStorage,
  TransactionStorage,
} from "@proto-kit/sequencer";
import { BlockModel, InclusionStatus } from "@proto-kit/api";

@injectable()
export class InMemoryBlockExplorer
  extends AppChainModule
  implements BlockExplorerTransportModule {
  public constructor(
    @inject("BlockStorage")
    private readonly blockStorage: BlockStorage,
    @inject("TransactionStorage")
    private readonly transactionStorage: TransactionStorage
  ) {
    super();
  }

  public async fetchTxStatus(txHash: string): Promise<InclusionStatus> {
    const dbTx = await this.transactionStorage.findTransaction(txHash);

    if (dbTx?.block !== undefined) {
      return InclusionStatus.INCLUDED;
    }

    return InclusionStatus.UNKNOWN;
  }

  async getBlock(param?: string | number): Promise<BlockModel | undefined> {
    let hash: string | undefined;
    let height: number | undefined;

    if (typeof param === "string") {
      hash = param;
    } else if (typeof param === "number") {
      height = param;
    }

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