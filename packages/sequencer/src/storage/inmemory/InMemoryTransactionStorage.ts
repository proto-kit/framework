import { inject, injectable } from "tsyringe";
import { TransactionStorage } from "../repositories/TransactionStorage";
import { PendingTransaction } from "../../mempool/PendingTransaction";
import {
  HistoricalUnprovenBlockStorage,
  UnprovenBlockStorage
} from "../repositories/UnprovenBlockStorage";

@injectable()
export class InMemoryTransactionStorage implements TransactionStorage {
  private queue: PendingTransaction[] = [];

  private latestScannedBlock = -1;

  public constructor(
    @inject("UnprovenBlockStorage") private readonly blockStorage: UnprovenBlockStorage & HistoricalUnprovenBlockStorage
  ) {}

  public async getPendingUserTransactions(): Promise<PendingTransaction[]> {
    const nextHeight = await this.blockStorage.getCurrentBlockHeight()
    for(let height = this.latestScannedBlock + 1 ; height < nextHeight ; height++) {
      const block = await this.blockStorage.getBlockAt(height);
      if (block !== undefined){
        const hashes = block.transactions.map(tx => tx.tx.hash().toString())
        this.queue = this.queue.filter(tx => !hashes.includes(tx.hash().toString()))
      }
    }
    this.latestScannedBlock = nextHeight - 1;

    return this.queue.slice();
  }

  public async pushUserTransaction(tx: PendingTransaction): Promise<boolean> {
    const notInQueue = this.queue.find(tx2 => tx2.hash().toString() === tx.hash().toString()) === undefined
    if(notInQueue){
      this.queue.push(tx);
    }
    return notInQueue;
  }
}
