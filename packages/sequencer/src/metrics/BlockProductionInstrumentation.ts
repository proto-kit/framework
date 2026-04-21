import { inject, injectable } from "tsyringe";

import type { BlockTriggerBase } from "../protocol/production/trigger/BlockTrigger";

import { instrumentation, PushInstrumentation } from "./Instrumentation";

@instrumentation()
@injectable()
export class BlockProductionInstrumentation extends PushInstrumentation {
  names = ["block_height", "block_result", "batch_height"];

  description = "L2 block height";

  public constructor(
    @inject("BlockTrigger")
    private readonly trigger: BlockTriggerBase
  ) {
    super();
  }

  public async start() {
    this.trigger.events.on("block-produced", (block) => {
      this.pushValue("block_height", parseInt(block.height.toString(), 10));
    });

    this.trigger.events.on("block-metadata-produced", (block) => {
      this.pushValue(
        "block_result",
        parseInt(block.block.height.toString(), 10)
      );
    });

    this.trigger.events.on("batch-produced", (batch) => {
      this.pushValue("batch_height", parseInt(batch.height.toString(), 10));
    });
  }
}
