import { inject } from "tsyringe";
import { log } from "@proto-kit/common";

import { SequencerModule } from "../../../sequencer/builder/SequencerModule";
import { UnprovenProducerModule } from "../unproven/UnprovenProducerModule";
import { Mempool } from "../../../mempool/Mempool";

import { BlockTrigger } from "./BlockTrigger";

/**
 * Only unproven invocation at the moment, because
 * this is primarily for development and testing purposes
 */
export class AutomaticBlockTrigger
  extends SequencerModule<Record<string, never>>
  implements BlockTrigger
{
  public constructor(
    @inject("UnprovenProducerModule")
    private readonly unprovenProducerModule: UnprovenProducerModule,
    @inject("Mempool")
    private readonly mempool: Mempool
  ) {
    super();
  }

  public async start(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.mempool.events.on("transactionAdded", async () => {
      log.info("Transaction received, creating block...");
      await this.unprovenProducerModule.tryProduceUnprovenBlock();
    });
  }
}
