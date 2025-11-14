import { Field } from "o1js";

export interface ClientTransaction {
  tx: {
    hash: string;
    methodId: string;
    nonce: string;
    sender: string;
    argsFields: string[];
    auxiliaryData: string[];
    signature: {
      r: string;
      s: string;
    };
    isMessage: boolean;
  };
  status: boolean;
  statusMessage?: string;
}

export interface ClientBlock {
  hash: Field;
  previousBlockHash: Field | undefined;
  height: Field;
  transactions: ClientTransaction[];
  transactionsHash: Field;
}

export interface BlockExplorerTransportModule {
  fetchTxInclusion(txHash: string): Promise<string>;
  getBlock(
    param: { hash: string } | { height: number }
  ): Promise<ClientBlock | undefined>;
}
