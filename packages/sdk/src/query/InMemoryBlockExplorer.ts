
import { injectable, inject } from "tsyringe";
import { AppChainModule, Block, BlockExplorer, BlockStorage, TransactionStorage} from "@proto-kit/sequencer";
import {BlockModel} from "@proto-kit/api";
import { sleep } from "@proto-kit/common";

@injectable()
export class InMemoryBlockExplorer
  extends AppChainModule
  implements BlockExplorer {
  
  public constructor(
    @inject("TransactionStorage") 
    private transactionStorage: TransactionStorage,
    @inject("BlockStorage") 
    private readonly blockStorage: BlockStorage
  ) {
    super();
  }

  public async waitTxInclusion(
    txHash: string,
    interval = 1000,
    attempts = 5
  ) {
    while (true) {
      const dbTx = await this.transactionStorage.findTransaction(txHash);
      console.log("hier");
      
      if (dbTx?.block !== undefined) {
        return "INCLUDED"; 
      }
      
      if (attempts > 0 && attempts-- <= 0) {
        throw new Error("Transaction not included");
      }

      await sleep(interval);
    }
  }

  public async getBlock(hash: string | undefined, height: number | undefined) {
    
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