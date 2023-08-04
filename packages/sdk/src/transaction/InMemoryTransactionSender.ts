/* eslint-disable import/no-unused-modules */
import { RuntimeModulesRecord } from "@proto-kit/module";
import { ProtocolModulesRecord } from "@proto-kit/protocol/src/protocol/Protocol";
import {
  PrivateMempool,
  Sequencer,
  SequencerModulesRecord,
} from "@proto-kit/sequencer";
import { PendingTransaction } from "@proto-kit/sequencer/dist/mempool/PendingTransaction";
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
