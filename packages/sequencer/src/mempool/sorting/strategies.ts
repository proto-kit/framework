import type { PendingTransaction } from "../PendingTransaction";

import type { SortingStrategy, TransactionQueueItem } from "./types";

function getGasFee(tx: PendingTransaction): bigint {
  return 0n; // Placeholder
}

export const byFIFO: SortingStrategy = (groups) => {
  return groups
    .sort((a, b) => {
      const firstOrderA = a.transactions[0]?.order ?? Number.MAX_SAFE_INTEGER;
      const firstOrderB = b.transactions[0]?.order ?? Number.MAX_SAFE_INTEGER;
      return firstOrderA - firstOrderB;
    })
    .flatMap((group) => group.transactions);
};

// eslint-disable-next-line sonarjs/cognitive-complexity
export const byGreedyFee: SortingStrategy = (groups) => {
  const result: TransactionQueueItem[] = [];
  const workingGroups = groups.map((g) => ({
    sender: g.sender,
    transactions: [...g.transactions],
  }));

  let hasRemaining = true;
  while (hasRemaining) {
    hasRemaining = false;

    let bestGroupIndex = -1;
    let bestFee = -1n;
    let bestOrder = Number.MAX_SAFE_INTEGER;

    for (let i = 0; i < workingGroups.length; i++) {
      const group = workingGroups[i];
      if (group.transactions.length > 0) {
        hasRemaining = true;
        const tx = group.transactions[0];
        const fee = getGasFee(tx.transaction);

        if (fee > bestFee || (fee === bestFee && tx.order < bestOrder)) {
          bestFee = fee;
          bestOrder = tx.order;
          bestGroupIndex = i;
        }
      }
    }

    if (bestGroupIndex >= 0) {
      const tx = workingGroups[bestGroupIndex].transactions.shift()!;
      result.push(tx);
    }
  }

  return result;
};

export const byRoundRobin: SortingStrategy = (groups) => {
  const result: TransactionQueueItem[] = [];
  const workingGroups = groups.map((g) => ({
    sender: g.sender,
    transactions: [...g.transactions],
  }));

  let hasRemaining = true;
  while (hasRemaining) {
    hasRemaining = false;
    for (const group of workingGroups) {
      if (group.transactions.length > 0) {
        hasRemaining = true;
        const tx = group.transactions.shift()!;
        result.push(tx);
      }
    }
  }

  return result;
};
