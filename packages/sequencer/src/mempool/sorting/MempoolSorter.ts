import { injectable } from "tsyringe";

import { PendingTransaction } from "../PendingTransaction";

import {
  MempoolSortingConfig,
  TransactionGroup,
  TransactionQueueItem,
} from "./types";

@injectable()
export class MempoolSorter {
  constructor(private config: MempoolSortingConfig) {}

  public sortTransactions(
    transactions: PendingTransaction[]
  ): PendingTransaction[] {
    const groups = this.groupTransactionsBySender(transactions);

    // sort transactions within each group by nonce just in case
    groups.forEach((group) => {
      group.transactions.sort((a, b) => {
        const nonceA = BigInt(a.transaction.nonce.toString());
        const nonceB = BigInt(b.transaction.nonce.toString());

        if (nonceA < nonceB) return -1;
        if (nonceA > nonceB) return 1;
        return 0;
      });
    });

    if (this.config.maxTransactionsPerSender != null) {
      groups.forEach((group) => {
        group.transactions = group.transactions.slice(
          0,
          this.config.maxTransactionsPerSender
        );
      });
    }

    if (this.config.minGasFee != null) {
      groups.forEach((group) => {
        group.transactions = group.transactions.filter((tx) => {
          const gasFee = this.getGasFee(tx.transaction);
          return gasFee >= this.config.minGasFee!;
        });
      });
    }

    const sortedGroups = this.config.sortingStrategy(groups);

    return sortedGroups.map((item) => item.transaction);
  }

  private groupTransactionsBySender(
    transactions: PendingTransaction[]
  ): TransactionGroup[] {
    const groupMap = new Map<string, TransactionQueueItem[]>();

    let order = 0;
    transactions.forEach((tx) => {
      const sender = tx.sender.toBase58();
      if (!groupMap.has(sender)) {
        groupMap.set(sender, []);
      }
      groupMap.get(sender)!.push({ transaction: tx, order });
      order += 1;
    });

    const groups: TransactionGroup[] = [];
    groupMap.forEach((txs, sender) => {
      groups.push({ sender, transactions: txs });
    });

    return groups;
  }

  private getGasFee(tx: PendingTransaction): bigint {
    return 0n; // Placeholder
  }
}
