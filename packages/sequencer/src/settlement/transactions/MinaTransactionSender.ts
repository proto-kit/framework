import { fetchAccount, PublicKey, Transaction, UInt64 } from "o1js";
import { inject, injectable } from "tsyringe";
import { filterNonUndefined, log } from "@proto-kit/common";

import type { MinaBaseLayer } from "../../protocol/baselayer/MinaBaseLayer";
import { PendingL1TransactionStorage } from "../../storage/repositories/PendingL1TransactionStorage";
import { FlowCreator } from "../../worker/flow/Flow";
import {
  SettlementProvingTask,
  TransactionTaskResult,
} from "../tasks/SettlementProvingTask";
import { FeeStrategy } from "../../protocol/baselayer/fees/FeeStrategy";
import { MinaSigner } from "../MinaSigner";
import { closeable, Closeable } from "../../sequencer/builder/Closeable";

import { MinaTransactionSimulator } from "./MinaTransactionSimulator";
import { L1TransactionDispatcher } from "./L1TransactionDispatcher";
import { TxStatusWaiter, WaitableTxStatus } from "./TxStatusWaiter";

export type TxSendResult<
  Input extends "sent" | "included" | "queued" | "none",
> = Input extends "none" ? void : { transactionId: string };

@injectable()
@closeable()
export class MinaTransactionSender implements Closeable {
  public constructor(
    private readonly creator: FlowCreator,
    private readonly provingTask: SettlementProvingTask,
    private readonly simulator: MinaTransactionSimulator,
    @inject("BaseLayer") private readonly baseLayer: MinaBaseLayer,
    @inject("PendingL1TransactionStorage")
    private readonly pendingStorage: PendingL1TransactionStorage,
    @inject("SettlementSigner") private readonly signer: MinaSigner,
    @inject("FeeStrategy") private readonly feeStrategy: FeeStrategy,
    private readonly dispatcher: L1TransactionDispatcher,
    private readonly waiter: TxStatusWaiter
  ) {
    this.dispatcher.start();
  }

  public async getNextNonce(sender: PublicKey): Promise<number> {
    const account = await this.simulator.getAccount(sender);
    return parseInt(account.nonce.toString(), 10);
  }

  /**
   * sets the fee, signs the transaction, proves it, and sends it to the network.
   */
  public async signProveAndSendTransaction<
    Wait extends "sent" | "included" | "queued" | "none",
  >(
    transaction: Transaction<false, any>,
    signers: PublicKey[],
    waitOnStatus: Wait
  ): Promise<TxSendResult<Wait>> {
    const unsignedTx = await transaction.setFee(
      UInt64.from(this.feeStrategy.getFee())
    );
    const signedTx = this.signer.signTx(
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      unsignedTx as Transaction<false, false>,
      { pubKeys: signers }
    );
    return await this.proveAndSendTransaction(signedTx, waitOnStatus);
  }

  /**
   * Submit a transaction to be proven, queued and dispatched to L1.
   */
  public async proveAndSendTransaction<
    Wait extends "sent" | "included" | "queued" | "none",
  >(
    transaction: Transaction<false, any>,
    waitOnStatus: Wait
  ): Promise<TxSendResult<Wait>> {
    const { publicKey, nonce } = transaction.transaction.feePayer.body;
    const sender = publicKey.toBase58();
    const nonceNum = Number(nonce.toString());
    const result = await this.proveTransaction(transaction, sender, nonceNum);

    log.debug("Tx proving complete, queueing for sending");

    const now = new Date();
    const txnId = await this.pendingStorage.queue({
      sender,
      nonce: nonceNum,
      attempts: 0,
      transaction: result.transaction,
      queuedAt: now,
      nextActionAt: now,
    });

    this.dispatcher.requestDispatch(sender);

    if (waitOnStatus === "queued") {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return { transactionId: txnId } as TxSendResult<Wait>;
    }

    if (waitOnStatus === "sent" || waitOnStatus === "included") {
      const desired: WaitableTxStatus = waitOnStatus;
      await this.waiter.waitFor(txnId, desired);
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return { transactionId: txnId } as TxSendResult<Wait>;
    }

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return undefined as TxSendResult<Wait>;
  }

  private async proveTransaction(
    transaction: Transaction<false, any>,
    sender: string,
    nonceNum: number
  ): Promise<TransactionTaskResult> {
    log.debug(`Proving tx from sender ${sender} nonce ${nonceNum}`);

    const flow = this.creator.createFlow(`tx-${sender}-${nonceNum}`, {});

    const accounts = await Promise.all(
      transaction.transaction.accountUpdates.map(
        async (au) =>
          await fetchAccount({ publicKey: au.publicKey, tokenId: au.tokenId })
      )
    );

    await this.simulator.getAccounts(transaction);
    await this.simulator.applyTransaction(transaction);

    const { network } = this.baseLayer.config;
    const graphql = network.type === "local" ? undefined : network.graphql;

    const resultPromise = flow.withFlow<TransactionTaskResult>(
      async (resolve, reject) => {
        await flow.pushTask(
          this.provingTask,
          {
            transaction,
            chainState: {
              graphql,
              accounts: accounts
                .map((r) => r.account)
                .filter(filterNonUndefined),
            },
          },
          async (result) => {
            resolve(result);
          }
        );
      }
    );

    return await resultPromise;
  }

  public async close(): Promise<void> {
    await this.dispatcher.stop();
  }
}
