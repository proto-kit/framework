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

export type OrderingMetadata = {
  skippedPaths: { [p: string]: bigint[] };
  allChangedPaths: bigint[];
};

export class PathResolution<Object> {
  failedTxIds = new Map<symbol, Object>();

  paths = new Map<bigint, symbol[]>();

  public resolvePaths(paths: bigint[]) {
    const allSymbols = paths.flatMap((key) => {
      const symbols = this.paths.get(key);
      if (symbols !== undefined) {
        this.paths.delete(key);
      }
      return symbols ?? [];
    });

    return allSymbols
      .map((symbol) => {
        const tx = this.failedTxIds.get(symbol);
        this.failedTxIds.delete(symbol);
        return tx;
      })
      .filter(filterNonUndefined);
  }

  public pushPaths(object: Object, paths: bigint[]) {
    const symbol = Symbol("tx");
    this.failedTxIds.set(symbol, object);

    paths.forEach((path) => {
      const symbols = this.paths.get(path) ?? [];
      symbols.push(symbol);
      this.paths.set(path, symbols);
    });
  }

  // TODO I hate how inefficient this function is - the tradeoff here is
  //  lookup performance during block production vs. after
  public retrieveUnresolved(key: (o: Object) => string) {
    const paths = new Map<string, bigint[]>();
    for (const [path, txs] of this.paths.entries()) {
      txs.forEach((tx) => {
        const hash = key(this.failedTxIds.get(tx)!);
        const thisPaths = paths.get(hash) ?? [];
        thisPaths.push(path);
        paths.set(hash, thisPaths);
      });
    }
    return Object.fromEntries(paths.entries());
  }
}

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
  pathResolution = new PathResolution<PendingTransaction>();

  allChangedPaths = new Set<bigint>();

  public resolvePaths(result: TransactionExecutionResult) {
    const paths = allKeys(
      result.stateTransitions.flatMap((x) => x.stateTransitions)
    );

    const txs = this.pathResolution.resolvePaths(paths);

    this.transactionQueue.push(...txs);

    paths.forEach((path) => this.allChangedPaths.add(path));
  }

  private pushFailed(result: TransactionExecutionResult) {
    const keys = allKeys(result.stateTransitions[0].stateTransitions);

    this.pathResolution.pushPaths(result.tx, keys);
  }

  public reportResult({ result, shouldRemove }: OrderingReport) {
    if (result.hooksStatus.toBoolean() || result.tx.isMessage) {
      // Included
      this.ordered += 1;
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

  private space() {
    return this.sizeLimit - this.ordered;
  }

  private mandoQueue: PendingTransaction[] = [];

  public async requestNextTransaction() {
    // Fetch messages
    if (!this.mandatoryTransactionsCompleted) {
      const mandos = await this.mempool.getMandatoryTxs();
      this.mandoQueue.push(...mandos);
      this.mandatoryTransactionsCompleted = true;
    }

    if (this.mandoQueue.length > 0) {
      return this.mandoQueue.shift();
    }

    const space = this.space();
    if (space > 0) {
      if (this.transactionQueue.length === 0) {
        // Fetch as many txs as space is availabe
        const newTxs = await this.mempool.getTxs(this.userTxOffset, space);
        this.userTxOffset += space;
        this.transactionQueue.push(...newTxs);
      }

      return this.transactionQueue.shift();
    } else {
      return undefined;
    }
  }

  public getResults() {
    const results = this.results
      .reverse()
      .filter(
        distinctByPredicate(
          (x, y) => x.tx.hash().toBigInt() === y.tx.hash().toBigInt()
        )
      )
      .reverse();

    return {
      results,
      orderingMetadata: {
        skippedPaths: this.pathResolution.retrieveUnresolved((tx) =>
          tx.hash().toString()
        ),
        allChangedPaths: Array.from(this.allChangedPaths),
      },
    };
  }
}
