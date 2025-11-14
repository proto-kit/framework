import { inject, injectable } from "tsyringe";
import {
  AppChainModule,
  Block,
  BlockExplorerTransportModule,
  BlockStorage,
  ClientBlock,
  ClientTransaction,
  TransactionStorage,
  InclusionStatus,
} from "@proto-kit/sequencer";
import { ModuleContainerLike } from "@proto-kit/common";

@injectable()
export class InMemoryBlockExplorer
  extends AppChainModule
  implements BlockExplorerTransportModule
{
  private readonly blockStorage: BlockStorage;

  private readonly transactionStorage: TransactionStorage;

  public constructor(
    @inject("Sequencer") public sequencer: ModuleContainerLike
  ) {
    super();
    this.blockStorage =
      sequencer.dependencyContainer.resolve<BlockStorage>("BlockStorage");
    this.transactionStorage =
      sequencer.dependencyContainer.resolve<TransactionStorage>(
        "TransactionStorage"
      );
  }

  public async fetchTxInclusion(txHash: string): Promise<InclusionStatus> {
    const dbTx = await this.transactionStorage.findTransaction(txHash);
    if (dbTx?.block !== undefined) {
      return InclusionStatus.INCLUDED;
    }
    return InclusionStatus.UNKNOWN;
  }

  async getBlock(
    param: { hash: string } | { height: number }
  ): Promise<ClientBlock | undefined> {
    let block: Block | undefined;

    if ("hash" in param) {
      block = await this.blockStorage.getBlock(param.hash);
    } else if ("height" in param) {
      block = await this.blockStorage.getBlockAt(param.height);
    } else {
      const currentHeight = await this.blockStorage.getCurrentBlockHeight();
      if (currentHeight > 0) {
        block = await this.blockStorage.getBlockAt(currentHeight - 1);
      }
    }

    if (block === undefined) {
      return undefined;
    }

    // Convert block.transactions to ClientTransaction format
    const clientTransactions: ClientTransaction[] = block.transactions.map(
      (txResult) => ({
        tx: {
          hash: txResult.tx.hash().toString(),
          methodId: txResult.tx.methodId.toString(),
          nonce: txResult.tx.nonce.toString(),
          sender: txResult.tx.sender.toBase58(),
          argsFields: txResult.tx.argsFields.map((f) => f.toString()),
          auxiliaryData: txResult.tx.auxiliaryData || [],
          signature: {
            r: txResult.tx.signature.r.toString(),
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            s: txResult.tx.signature.s.toString(),
          },
          isMessage: txResult.tx.isMessage || false,
        },
        status: txResult.status.toBoolean(),
        statusMessage: txResult.statusMessage,
      })
    );

    return {
      hash: block.hash,
      previousBlockHash: block.previousBlockHash,
      height: block.height,
      transactions: clientTransactions,
      transactionsHash: block.transactionsHash,
    };
  }
}
