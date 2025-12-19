import { fetchAccount, PublicKey, Transaction } from "o1js";
import { inject, injectable } from "tsyringe";
import {
  EventsRecord,
  log,
  ReplayingSingleUseEventEmitter,
  filterNonUndefined,
} from "@proto-kit/common";

import type { MinaBaseLayer } from "../../protocol/baselayer/MinaBaseLayer";
import {
  PendingL1TransactionRecord,
  PendingL1TransactionStorage,
} from "../../storage/repositories/PendingL1TransactionStorage";
import { FlowCreator } from "../../worker/flow/Flow";
import {
  SettlementProvingTask,
  TransactionTaskResult,
} from "../tasks/SettlementProvingTask";
import { FeeStrategy } from "../../protocol/baselayer/fees/FeeStrategy";
import { MinaSigner } from "../MinaSigner";
import { closeable, Closeable } from "../../sequencer/builder/Closeable";

import { L1TransactionRetryStrategy } from "./L1TransactionRetryStrategy";
import { MinaTransactionSimulator } from "./MinaTransactionSimulator";

export interface TxEvents extends EventsRecord {
  sent: [{ hash: string }];
  included: [{ hash: string }];
  rejected: [any];
}

export type TxSendResult<
  Input extends "sent" | "included" | "queued" | "none",
> = Input extends "none" ? void : { transactionId: string };

@injectable()
@closeable()
export class MinaTransactionSender implements Closeable {
  private activeEmitters = new Map<
    string,
    ReplayingSingleUseEventEmitter<TxEvents>
  >();

  private interval?: any;

  public constructor(
    private readonly creator: FlowCreator,
    private readonly provingTask: SettlementProvingTask,
    private readonly simulator: MinaTransactionSimulator,
    @inject("BaseLayer") private readonly baseLayer: MinaBaseLayer,
    @inject("PendingL1TransactionStorage")
    private readonly pendingStorage: PendingL1TransactionStorage,
    @inject("L1TransactionRetryStrategy")
    private readonly retryStrategy: L1TransactionRetryStrategy,
    @inject("SettlementSigner") private readonly signer: MinaSigner,
    @inject("FeeStrategy") private readonly feeStrategy: FeeStrategy
  ) {
    this.startPolling();
  }

  private getEmitterKey(sender: string, nonce: number): string {
    return `${sender}:${nonce}`;
  }

  public async getNextNonce(sender: PublicKey): Promise<number> {
    const account = await this.simulator.getAccount(sender);
    return parseInt(account.nonce.toString(), 10);
  }

  /**
   * If there is a transaction with a lower nonce thats not included yet,
   * this transaction will be queued instead.
   * @param transaction - The transaction to prove and send.
   * @param waitOnStatus
   * @returns
   */
  public async proveAndSendTransaction<
    Wait extends "sent" | "included" | "queued" | "none",
  >(
    transaction: Transaction<false, true>,
    waitOnStatus: Wait
  ): Promise<TxSendResult<Wait>> {
    const { publicKey, nonce } = transaction.transaction.feePayer.body;
    const sender = publicKey.toBase58();
    const nonceNum = Number(nonce.toString());
    // Set Fee [TODO] uncomment after the singer is implemented properly
    // const unsignedTx = await transaction.setFee(UInt64.from(this.feeStrategy.getFee()));
    // const signedTx = this.signer.signTransaction(unsignedTx);
    const signedTx = transaction;

    // Setup emitter before queueing
    const emitterKey = this.getEmitterKey(sender, nonceNum);
    const emitter = new ReplayingSingleUseEventEmitter<TxEvents>();
    this.activeEmitters.set(emitterKey, emitter);

    log.debug(`Proving tx from sender ${sender} nonce ${nonce.toString()}`);

    const flow = this.creator.createFlow(
      `tx-${sender}-${nonce.toString()}`,
      {}
    );

    const accounts = await Promise.all(
      signedTx.transaction.accountUpdates.map(
        async (au) =>
          await fetchAccount({ publicKey: au.publicKey, tokenId: au.tokenId })
      )
    );

    // Load accounts
    await this.simulator.getAccounts(signedTx);
    await this.simulator.applyTransaction(signedTx);

    log.trace("Applied transaction to local simulated ledger");

    const { network } = this.baseLayer.config;
    const graphql = network.type === "local" ? undefined : network.graphql;

    const resultPromise = flow.withFlow<TransactionTaskResult>(
      async (resolve, reject) => {
        await flow.pushTask(
          this.provingTask,
          {
            transaction: signedTx,
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

    const result = await resultPromise;

    log.debug("Tx proving complete, queueing for sending");

    log.trace(result.transaction.toPretty());

    // Queue the transaction
    const txnId = await this.pendingStorage.queue({
      sender,
      nonce: nonceNum,
      attempts: 0,
      transaction: result.transaction,
      sentAt: new Date(),
    });
    if (waitOnStatus === "queued") {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return { transactionId: txnId } as TxSendResult<Wait>;
    }

    if (waitOnStatus !== "none") {
      const waitInstruction: "sent" | "included" = waitOnStatus;
      const { transactionId: txId } = await new Promise<
        TxSendResult<"sent" | "included">
      >((resolve, reject) => {
        emitter.on(waitInstruction, (txSendResult) => {
          log.info(`Tx ${txnId} ${waitInstruction}`);
          resolve({ transactionId: txnId });
          if (waitInstruction === "included") {
            this.activeEmitters.delete(emitterKey);
          }
        });
        emitter.on("rejected", (error) => {
          reject(error);
          this.activeEmitters.delete(emitterKey);
        });
      });

      // Yeah that's not super clean, but couldn't figure out a better way tbh
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return { transactionId: txId } as TxSendResult<Wait>;
    }

    // If waitOnStatus is none, delete the emitter.
    this.activeEmitters.delete(emitterKey);

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return undefined as TxSendResult<Wait>;
  }

  private startPolling() {
    const intervalMs = 5000;

    this.interval = setInterval(async () => {
      try {
        await this.processPendingTransactions();
      } catch (e) {
        log.error("Error in MinaTransactionSender polling loop", e);
      }
    }, intervalMs);
  }

  public async close(): Promise<void> {
    if (this.interval !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  private async processPendingTransactions() {
    // Find all pending transactions, state: queued | sent
    const pendingTransactions = await this.pendingStorage.findByStatuses([
      "queued",
      "sent",
    ]);

    const bySender: Record<string, PendingL1TransactionRecord[]> = {};
    for (const tx of pendingTransactions) {
      (bySender[tx.sender] ??= []).push(tx);
    }

    for (const sender of Object.keys(bySender)) {
      // Sort in ascending order of nonce
      const txs = bySender[sender].sort((a, b) => a.nonce - b.nonce);
      // eslint-disable-next-line no-continue
      if (txs.length === 0) continue;

      // Send the first queued transaction,
      // transactions stays in queued state until the previous transaction is included or rejected
      const txToSend = txs[0];
      if (txToSend.status === "queued") {
        // eslint-disable-next-line no-await-in-loop
        await this.sendTransaction(txToSend);
      }
      // If the transaction is sent and the emitter is not active,
      // [TODO] check L1 for inclusion and retry if needed
      // else if (
      //   txToSend.status === "sent" &&
      //   !this.activeEmitters.has(
      //     this.getEmitterKey(txToSend.sender, txToSend.nonce)
      //   )
      // ) {
      //   await this.sendTransaction(txToSend);
      // }
    }
  }

  private async sendTransaction(record: PendingL1TransactionRecord) {
    const tx = record.transaction;
    const emitterKey = this.getEmitterKey(record.sender, record.nonce);
    const emitter = this.activeEmitters.get(emitterKey);

    try {
      const pendingTx = await tx.send();
      // Update DB
      await this.pendingStorage.update(record.id, {
        status: "sent",
        attempts: record.attempts + 1,
        sentAt: new Date(),
        transaction: tx,
      });

      log.info(
        `Sent L1 transaction ${pendingTx.hash} for nonce ${record.nonce} (Attempt ${record.attempts + 1})`
      );
      emitter?.emit("sent", { hash: pendingTx.hash });

      // Wait for inclusion
      pendingTx.wait().then(
        async (included) => {
          log.info(`Transaction ${included.hash} included`);
          emitter?.emit("included", { hash: included.hash });
          await this.pendingStorage.update(record.id, { status: "included" });
          this.activeEmitters.delete(emitterKey);
        },
        async (error) => {
          log.info(`Transaction ${pendingTx.hash} failed/rejected`, error);
          // retry the transaction
          await this.retryTransaction(record);
        }
      );
    } catch (error) {
      log.error(
        `Failed to send transaction ${record.sender}:${record.nonce}`,
        error
      );
      await this.pendingStorage.update(record.id, {
        status: "failed",
        lastError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async retryTransaction(record: PendingL1TransactionRecord) {
    const shouldRetry = await this.retryStrategy.shouldRetry(record);
    if (!shouldRetry) {
      const emitterKey = this.getEmitterKey(record.sender, record.nonce);
      const emitter = this.activeEmitters.get(emitterKey);
      if (emitter) {
        emitter.emit(
          "rejected",
          new Error(`Max attempts reached for ${record.sender}:${record.nonce}`)
        );
        this.activeEmitters.delete(emitterKey);
      }
      return;
    }
    // Prepare retry
    try {
      const retryTx = await this.retryStrategy.prepareRetryTransaction(record);
      const signedRetryTx = this.signer.signTx(
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        retryTx as Transaction<false, false>
      );
      // Send the retry transaction
      await this.sendTransaction({
        ...record,
        transaction: signedRetryTx,
        attempts: record.attempts + 1,
      });
    } catch (error) {
      log.error(
        `Failed to prepare retry for ${record.sender}:${record.nonce}`,
        error
      );
      await this.pendingStorage.update(record.id, {
        status: "failed",
        lastError: error instanceof Error ? error.message : String(error),
      });
      const emitterKey = this.getEmitterKey(record.sender, record.nonce);
      const emitter = this.activeEmitters.get(emitterKey);
      if (emitter) {
        emitter.emit("rejected", error);
      }
      this.activeEmitters.delete(emitterKey);
    }
  }
}
