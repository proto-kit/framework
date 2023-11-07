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
      const block = await this.unprovenProducerModule.tryProduceUnprovenBlock();

      // In case the block producer was busy, we need to re-trigger production
      // as soon as the previous production was finished
      if (block === undefined) {
        this.unprovenProducerModule.events.on(
          "unprovenBlockProduced",
          async () => {
            // eslint-disable-next-line max-len
            // Make sure this comes before await, because otherwise we have a race condition
            this.unprovenProducerModule.events.offSelf();
            await this.unprovenProducerModule.tryProduceUnprovenBlock();
          }
        );
      }
    });
  }
}
