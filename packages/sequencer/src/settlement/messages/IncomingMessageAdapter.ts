import { PublicKey } from "o1js";

import { PendingTransaction } from "../../mempool/PendingTransaction";

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
