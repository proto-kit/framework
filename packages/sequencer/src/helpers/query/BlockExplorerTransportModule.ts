import { Block } from "../../storage/model/Block";

export type ClientBlock = Pick<Block, "hash" | "previousBlockHash" | "height" | "transactions" | "transactionsHash">;

export interface BlockExplorerTransportModule {
  waitTxInclusion(txHash: string): Promise<string>;
  getBlock(param?: string | number): Promise<ClientBlock | undefined>;
}
