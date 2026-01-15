import { PublicKey } from "o1js";

import { PendingTransactionJSONType } from "../../mempool/PendingTransaction";

/**
 * An interface provided by the BaseLayer via DependencyFactory,
 * which implements a function that allows us to retrieve
 * unconsumed incoming messages from the BaseLayer
 * (Dispatched Deposit Actions for example)
 */
export interface IncomingMessageAdapter {
  fetchPendingMessages: (
    address: PublicKey,
    params: {
      fromActionHash: string;
      toActionHash?: string;
      fromL1BlockHeight: number;
    }
  ) => Promise<{
    from: string;
    to: string;
    messages: PendingTransactionJSONType[];
  }>;
}
