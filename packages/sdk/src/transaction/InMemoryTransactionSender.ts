import {
  PrivateMempool,
  AppChainModule,
  PendingTransactionJSONType,
} from "@proto-kit/sequencer";
import { inject, injectable } from "tsyringe";
import { ModuleContainerLike } from "@proto-kit/common";

export interface TransactionSender extends AppChainModule<unknown> {
  send: (transaction: PendingTransactionJSONType) => Promise<void>;
}

@injectable()
export class InMemoryTransactionSender
  extends AppChainModule
  implements TransactionSender
{
  public mempool: PrivateMempool;

  public constructor(
    @inject("Sequencer") public sequencer: ModuleContainerLike
  ) {
    super();

    this.mempool = this.sequencer.resolveOrFail("Mempool", PrivateMempool);
  }

  public async send(transaction: PendingTransactionJSONType) {
    await this.mempool.add(transaction);
  }
}
