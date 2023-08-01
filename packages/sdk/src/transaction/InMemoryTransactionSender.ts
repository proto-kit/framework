/* eslint-disable import/no-unused-modules */
import { RuntimeModulesRecord } from "@yab/module";
import { ProtocolModulesRecord } from "@yab/protocol/src/protocol/Protocol";
import {
  PrivateMempool,
  Sequencer,
  SequencerModulesRecord,
} from "@yab/sequencer";
import { PendingTransaction } from "@yab/sequencer/dist/mempool/PendingTransaction";
import { inject, injectable } from "tsyringe";
import { AppChain, AppChainModulesRecord } from "../appChain/AppChain";
import { AppChainModule } from "../appChain/AppChainModule";

export interface TransactionSender extends AppChainModule<unknown> {
  send: (transaction: PendingTransaction) => Promise<void>;
}

@injectable()
export class InMemoryTransactionSender
  extends AppChainModule<unknown>
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
    console.log("sending transaction", transaction);
    this.mempool.add(transaction);
  }
}
