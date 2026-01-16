import { Field } from "o1js";
import { filterNonUndefined } from "@proto-kit/common";

import { distinct, distinctByPredicate } from "../../../helpers/utils";
import { Mempool } from "../../../mempool/Mempool";
import { PendingTransaction } from "../../../mempool/PendingTransaction";
import { TransactionExecutionResult } from "../../../storage/model/Block";

import { TransactionExecutionResultStatus } from "./TransactionExecutionService";

function allKeys(stateTransitions: { path: Field }[]): bigint[] {
  // We have to do the distinct with strings because
  // array.indexOf() doesn't work with fields
  return stateTransitions.map((st) => st.path.toBigInt()).filter(distinct);
}

export type OrderingReport = {
  result: TransactionExecutionResult;
  shouldRemove: boolean;
};

export class Ordering {
  public constructor(
    private readonly mempool: Mempool,
    private sizeLimit: number
  ) {}

  mandatoryTransactionsCompleted = false;

  transactionQueue: PendingTransaction[] = [];

  results: TransactionExecutionResultStatus[] = [];

  ordered = 0;

  userTxOffset = 0;

  // For dependency resolution
  failedTxIds = new Map<symbol, PendingTransaction>();

  paths = new Map<bigint, symbol[]>();

  public resolvePaths(result: TransactionExecutionResult) {
    const keys = allKeys(result.stateTransitions[0].stateTransitions);

    const allSymbols = keys.flatMap((key) => {
      const symbols = this.paths.get(key);
      if (symbols !== undefined) {
        this.paths.delete(key);
      }
      return symbols ?? [];
    });

    const txs = allSymbols
      .map((symbol) => {
        const tx = this.failedTxIds.get(symbol);
        this.failedTxIds.delete(symbol);
        return tx;
      })
      .filter(filterNonUndefined);

    this.transactionQueue.push(...txs);
  }

  private pushFailed(result: TransactionExecutionResult) {
    const symbol = Symbol("tx");
    this.failedTxIds.set(symbol, result.tx);

    const keys = allKeys(result.stateTransitions[0].stateTransitions);
    keys.forEach((key) => {
      const symbols = this.paths.get(key) ?? [];
      symbols.push(symbol);
      this.paths.set(key, symbols);
    });
  }

  public reportResult({ result, shouldRemove }: OrderingReport) {
    if (result.hooksStatus.toBoolean() || result.tx.isMessage) {
      // Included
      this.ordered += 1;
      this.userTxOffset += result.tx.isMessage ? 0 : 1;
      this.results.push({
        status: "included",
        result,
        tx: result.tx,
      });
      this.resolvePaths(result);
    } else if (shouldRemove) {
      // Dropped
      this.results.push({
        status: "shouldRemove",
        tx: result.tx,
      });
    } else {
      // Might become valid
      this.results.push({
        status: "skipped",
        tx: result.tx,
      });
      this.pushFailed(result);
    }
  }

  public async requestNextTransaction() {
    if (this.transactionQueue.length === 0) {
      // Fetch messages
      if (!this.mandatoryTransactionsCompleted) {
        const mandos = await this.mempool.getMandatoryTxs();
        this.transactionQueue.push(...mandos);
        this.mandatoryTransactionsCompleted = true;
      }

      // Fetch as much txs as space is available
      const space = this.sizeLimit - this.ordered;
      if (space > 0) {
        const newTxs = await this.mempool.getTxs(this.userTxOffset, space);
        this.transactionQueue.push(...newTxs);
      }
    }

    return this.transactionQueue.pop();
  }

  public getResults() {
    return this.results
      .reverse()
      .filter(
        distinctByPredicate(
          (x, y) => x.tx.hash().toBigInt() === y.tx.hash().toBigInt()
        )
      )
      .reverse();
  }
}
