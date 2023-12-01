import {
  PrivateMempool,
  Sequencer,
  SequencerModulesRecord,
  PendingTransaction,
} from "@proto-kit/sequencer";
import { inject, injectable } from "tsyringe";
import { NoConfig } from "@proto-kit/common";

import { AppChainModule } from "../appChain/AppChainModule";

export interface TransactionSender extends AppChainModule<unknown> {
  send: (transaction: PendingTransaction) => Promise<void>;
}

@injectable()
export class InMemoryTransactionSender
  extends AppChainModule<NoConfig>
  implements TransactionSender
{
  public mempool: PrivateMempool;

  public constructor(
    @inject("Sequencer") public sequencer: Sequencer<SequencerModulesRecord>
  ) {
    super();

    this.mempool = this.sequencer.resolveOrFail("Mempool", PrivateMempool);
  }

  public async send(transaction: PendingTransaction) {
    this.mempool.add(transaction);
  }
}
