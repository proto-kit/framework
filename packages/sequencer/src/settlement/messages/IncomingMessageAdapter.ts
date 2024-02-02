import { PublicKey } from "o1js";

import { PendingTransaction } from "../../mempool/PendingTransaction";

/**
 * An interface provided by the BaseLayer via DependencyFactory,
 * which implements a function that allows us to retrieve
 * unconsumed incoming messages from the BaseLayer
 * (Dispatched Deposit Actions for example)
 */
export interface IncomingMessageAdapter {
  getPendingMessages: (
    address: PublicKey,
    params: {
      fromActionHash: string;
      toActionHash?: string;
      fromL1Block: number;
    }
  ) => Promise<{
    from: string;
    to: string;
    messages: PendingTransaction[];
  }>;
}
