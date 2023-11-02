import {
  sequencerModule,
  SequencerModule,
} from "../../../sequencer/builder/SequencerModule";
import { inject } from "tsyringe";
import { CachedStateService } from "../../../state/state/CachedStateService";
import {
  TransactionExecutionService,
  UnprovenBlock,
} from "./TransactionExecutionService";
import { BlockStorage } from "../../../storage/repositories/BlockStorage";
import { Mempool } from "../../../mempool/Mempool";
import { NetworkState } from "@proto-kit/protocol";
import { UInt64 } from "o1js";
import { log, noop, requireTrue } from "@proto-kit/common";

const errors = {
  txRemovalFailed: () => new Error("Removal of txs from mempool failed"),
};

@sequencerModule()
export class UnprovenProducerModule extends SequencerModule<unknown> {
  private productionInProgress = false;

  public constructor(
    @inject("Mempool") private readonly mempool: Mempool,
    @inject("BlockStorage") private readonly blockStorage: BlockStorage,
    @inject("UnprovenStateService")
    private readonly unprovenStateService: CachedStateService,
    private readonly executionService: TransactionExecutionService
  ) {
    super();
  }

  private createNetworkState(lastHeight: number): NetworkState {
    return new NetworkState({
      block: {
        height: UInt64.from(lastHeight + 1),
      },
    });
  }

  public async tryProduceUnprovenBlock(): Promise<UnprovenBlock | undefined> {
    if (!this.productionInProgress) {
      try {
        return await this.produceUnprovenBlock();
      } catch (error: unknown) {
        if (error instanceof Error) {
          this.productionInProgress = false;
          throw error;
        } else {
          log.error(error);
        }
      }
    }
    return undefined;
  }

  private async produceUnprovenBlock(): Promise<UnprovenBlock> {
    this.productionInProgress = true;

    // Get next blockheight and therefore taskId
    const lastHeight = await this.blockStorage.getCurrentBlockHeight();

    const { txs } = this.mempool.getTxs();

    const networkState = this.createNetworkState(lastHeight);

    const stateService = new CachedStateService(this.unprovenStateService);

    const block = await this.executionService.createUnprovenBlock(
      stateService,
      txs,
      networkState
    );

    this.productionInProgress = false;

    requireTrue(this.mempool.removeTxs(txs), errors.txRemovalFailed);

    return block;
  }

  public async start() {
    noop();
  }
}
