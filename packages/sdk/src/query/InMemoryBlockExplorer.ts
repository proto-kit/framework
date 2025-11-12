import { inject, injectable } from "tsyringe";
import {
  AppChainModule,
  Block,
  BlockExplorerTransportModule,
  BlockStorage,
  TransactionStorage,
} from "@proto-kit/sequencer";
import { BlockModel, InclusionStatus } from "@proto-kit/api";
import { ModuleContainerLike } from "@proto-kit/common";

@injectable()
export class InMemoryBlockExplorer
  extends AppChainModule
  implements BlockExplorerTransportModule
{
  private readonly blockStorage: BlockStorage;

  private readonly transactionStorage: TransactionStorage;

  public constructor(
    @inject("Sequencer") public sequencer: ModuleContainerLike
  ) {
    super();
    this.blockStorage =
      sequencer.dependencyContainer.resolve<BlockStorage>("BlockStorage");
    this.transactionStorage =
      sequencer.dependencyContainer.resolve<TransactionStorage>(
        "TransactionStorage"
      );
  }

  public async waitTxInclusion(txHash: string): Promise<InclusionStatus> {
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
