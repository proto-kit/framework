import { checkZkappTransaction } from "o1js";
import { log, sleep } from "@proto-kit/common";

/**
 * Polls checkZkappTransaction until the transaction is successful or times out
 * @param txnHash - The transaction hash to check
 * @param pollIntervalMs - Interval between polls in milliseconds (default: 10000)
 * @param maxPolls - Maximum number of polls before giving up (default: 60)
 * @returns
 */
export async function pollTransactionStatus(
  txnHash: string,
  pollIntervalMs: number = 10000,
  maxPolls: number = 60
): Promise<"included" | "not-found"> {
  /* eslint-disable no-await-in-loop */
  for (let pollCount = 0; pollCount < maxPolls; pollCount++) {
    const result = await checkZkappTransaction(txnHash);

    if (result.success) {
      log.info(`Transaction ${txnHash} confirmed as successful`);
      return "included";
    }
    // Wait before next poll
    if (pollCount < maxPolls - 1) {
      await sleep(pollIntervalMs);
    }
  }
  /* eslint-enable no-await-in-loop */
  return "not-found";
}
