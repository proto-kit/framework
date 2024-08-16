import { Mina, Transaction } from "o1js";
import { inject, injectable } from "tsyringe";
import {
  EventEmitter,
  EventsRecord,
  EventListenable,
  log,
} from "@proto-kit/common";

import type { MinaBaseLayer } from "../../protocol/baselayer/MinaBaseLayer";
import { FlowCreator } from "../../worker/flow/Flow";
import {
  SettlementProvingTask,
  TransactionTaskResult,
} from "../tasks/SettlementProvingTask";

import { MinaTransactionSimulator } from "./MinaTransactionSimulator";

type SenderKey = string;

interface TxEvents extends EventsRecord {
  sent: [{ hash: string }];
  included: [{ hash: string }];
  rejected: [any];
}

class OnceReplayingEventEmitter<
  Events extends EventsRecord,
> extends EventEmitter<Events> {
  public emitted: Partial<Events> = {};

  public emit<Key extends keyof Events>(
    event: Key,
    ...parameters: Events[Key]
  ) {
    super.emit(event, ...parameters);
    this.emitted[event] = parameters;
    this.listeners[event] = [];
  }

  public onAll(listener: (event: keyof Events, args: unknown[]) => void) {
    Object.entries(this.emitted).forEach(([key, params]) => {
      if (params !== undefined) listener(key, params);
    });
    super.onAll(listener);
  }

  public on<Key extends keyof Events>(
    event: Key,
    listener: (...args: Events[Key]) => void
  ) {
    if (this.emitted[event] !== undefined) {
      listener(...this.emitted[event]!);
    }
    super.on(event, listener);
  }
}

@injectable()
export class MinaTransactionSender {
  private txStatusEmitters: Record<string, EventEmitter<TxEvents>> = {};

  // TODO Persist all of that
  private txQueue: Record<SenderKey, number[]> = {};

  private txIdCursor: number = 0;

  private cache: { tx: Transaction<any, true>; id: number }[] = [];

  public constructor(
    private readonly creator: FlowCreator,
    private readonly provingTask: SettlementProvingTask,
    private readonly simulator: MinaTransactionSimulator,
    @inject("BaseLayer") private readonly baseLayer: MinaBaseLayer
  ) {}

  private async trySendCached({
    tx,
    id,
  }: {
    tx: Transaction<any, true>;
    id: number;
  }): Promise<Mina.PendingTransaction | undefined> {
    const feePayer = tx.transaction.feePayer.body;
    const sender = feePayer.publicKey.toBase58();
    const senderQueue = this.txQueue[sender];

    const sendable = senderQueue.at(0) === Number(feePayer.nonce.toString());
    if (sendable) {
      const txId = await tx.send();

      const statusEmitter = this.txStatusEmitters[id];
      log.info(`Sent L1 transaction ${txId.hash}`);
      statusEmitter.emit("sent", { hash: txId.hash });

      txId.wait().then(
        (included) => {
          log.info(`L1 transaction ${included.hash} has been included`);
          statusEmitter.emit("included", { hash: included.hash });
        },
        (error) => {
          log.info("Waiting on L1 transaction threw and error", error);
          statusEmitter.emit("rejected", error);
        }
      );

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

  private async sendOrQueue(
    tx: Transaction<any, true>
  ): Promise<EventListenable<TxEvents>> {
    // eslint-disable-next-line no-plusplus
    const id = this.txIdCursor++;
    this.cache.push({ tx, id });
    const eventEmitter = new OnceReplayingEventEmitter<TxEvents>();
    this.txStatusEmitters[id] = eventEmitter;

    let removedLastIteration = 0;
    do {
      // eslint-disable-next-line no-await-in-loop
      removedLastIteration = await this.resolveCached();
    } while (removedLastIteration > 0);

    // This altered return type only exposes listening-related functions and erases the rest
    return eventEmitter;
  }

  public async proveAndSendTransaction(
    transaction: Transaction<false, true>,
    waitOnStatus: "sent" | "included" | "none" = "none"
  ) {
    const { publicKey, nonce } = transaction.transaction.feePayer.body;

    // Add Transaction to sender's queue
    (this.txQueue[publicKey.toBase58()] ??= []).push(Number(nonce.toString()));

    const flow = this.creator.createFlow(
      `tx-${publicKey.toBase58()}-${nonce.toString()}`,
      {}
    );

    const accounts = await this.simulator.getAccounts(transaction);

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
    const txStatus = await this.sendOrQueue(result.transaction);

    if (waitOnStatus !== "none") {
      await new Promise<void>((resolve, reject) => {
        txStatus.on(waitOnStatus, () => {
          resolve();
        });
        txStatus.on("rejected", (error) => {
          reject(error);
        });
      });
    }
    return txStatus;
  }
}
