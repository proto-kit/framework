import { Mina, Transaction } from "o1js";
import { inject, injectable } from "tsyringe";

import type { MinaBaseLayer } from "../../protocol/baselayer/MinaBaseLayer";
import { FlowCreator } from "../../worker/flow/Flow";
import {
  SettlementProvingTask,
  TransactionTaskResult,
} from "../tasks/SettlementProvingTask";

import { MinaTransactionSimulator } from "./MinaTransactionSimulator";

type SenderKey = string;

@injectable()
export class MinaTransactionSender {
  private txQueue: Record<SenderKey, number[]> = {};

  // TODO Persist
  private cache: Transaction<any, true>[] = [];

  public constructor(
    private readonly creator: FlowCreator,
    private readonly provingTask: SettlementProvingTask,
    private readonly simulator: MinaTransactionSimulator,
    @inject("BaseLayer") private readonly baseLayer: MinaBaseLayer
  ) {}

  private async trySendCached(
    tx: Transaction<any, true>
  ): Promise<Mina.PendingTransaction | undefined> {
    const feePayer = tx.transaction.feePayer.body;
    const sender = feePayer.publicKey.toBase58();
    const senderQueue = this.txQueue[sender];

    const sendable = senderQueue.at(0) === Number(feePayer.nonce.toString());
    if (sendable) {
      const txId = await tx.send();

      senderQueue.pop();
      return txId;
    }
    return undefined;
  }

  private async resolveCached(): Promise<number> {
    const indizesToRemove: number[] = [];
    for (let i = 0; i < this.cache.length; i++) {
      // eslint-disable-next-line no-await-in-loop
      const result = await this.trySendCached(this.cache[i]);
      if (result !== undefined) {
        indizesToRemove.push(i);
      }
    }
    this.cache = this.cache.filter(
      (ignored, index) => !indizesToRemove.includes(index)
    );
    return indizesToRemove.length;
  }

  private async sendOrQueue(tx: Transaction<any, true>) {
    this.cache.push(tx);

    let removedLastIteration = 0;
    do {
      // eslint-disable-next-line no-await-in-loop
      removedLastIteration = await this.resolveCached();
    } while (removedLastIteration > 0);
  }

  public async proveAndSendTransaction(transaction: Transaction<false, true>) {
    const { publicKey, nonce } = transaction.transaction.feePayer.body;

    // Add Transaction to sender's queue
    (this.txQueue[publicKey.toBase58()] ??= []).push(Number(nonce.toString()));

    const flow = this.creator.createFlow(
      `tx-${publicKey.toBase58()}-${nonce.toString()}`,
      {}
    );

    const accounts = await this.simulator.getAccounts(transaction);

    await this.simulator.applyTransaction(transaction);

    const resultPromise = flow.withFlow<TransactionTaskResult>(
      async (resolve, reject) => {
        await flow.pushTask(
          this.provingTask,
          {
            transaction,
            chainState: {
              graphql: this.baseLayer.config.network.graphql,
              accounts,
            },
          },
          async (result) => {
            resolve(result);
          }
        );
      }
    );

    const result = await resultPromise;
    await this.sendOrQueue(result.transaction);
  }
}
