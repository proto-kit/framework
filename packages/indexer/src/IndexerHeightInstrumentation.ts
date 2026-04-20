import { inject, injectable } from "tsyringe";
import {
  BlockStorage,
  instrumentation,
  PollInstrumentation,
} from "@proto-kit/sequencer";

@instrumentation()
@injectable()
export class IndexerHeightInstrumentation implements PollInstrumentation {
  name = "indexer_block_height";

  description = "Indexer block height";

  public constructor(
    @inject("BlockStorage")
    private readonly blockStorage: BlockStorage
  ) {}

  public async poll() {
    return await this.blockStorage.getCurrentBlockHeight();
  }
}
