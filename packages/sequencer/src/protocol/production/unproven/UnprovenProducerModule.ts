import { inject } from "tsyringe";
import { NetworkState } from "@proto-kit/protocol";
import { UInt64 } from "o1js";
import {
  EventEmitter,
  EventEmittingComponent,
  EventsRecord,
  log,
  noop,
  requireTrue,
} from "@proto-kit/common";

import { Mempool } from "../../../mempool/Mempool";
import { BlockStorage } from "../../../storage/repositories/BlockStorage";
import { CachedStateService } from "../../../state/state/CachedStateService";
import {
  sequencerModule,
  SequencerModule,
} from "../../../sequencer/builder/SequencerModule";

import {
  TransactionExecutionService,
  UnprovenBlock,
} from "./TransactionExecutionService";

const errors = {
  txRemovalFailed: () => new Error("Removal of txs from mempool failed"),
};

interface UnprovenProducerEvents extends EventsRecord {
  unprovenBlockProduced: [UnprovenBlock];
}

@sequencerModule()
export class UnprovenProducerModule
  extends SequencerModule<unknown>
  implements EventEmittingComponent<UnprovenProducerEvents>
{
  private productionInProgress = false;

  public events = new EventEmitter<UnprovenProducerEvents>();

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
        const block = await this.produceUnprovenBlock();

        log.info(`Produced unproven block (${block.transactions.length} txs)`);
        this.events.emit("unprovenBlockProduced", [block]);

        return block;
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
