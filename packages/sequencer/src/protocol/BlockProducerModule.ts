import { SequencerModule } from "../runtime/builder/SequencerModule";
import { inject } from "tsyringe";
import { Runtime } from "@yab/module";
import { FlipOptional } from "@yab/protocol";

interface RuntimeSequencerModuleConfig {
  proofsEnabled?: boolean
}

export class BlockProducerModule extends SequencerModule<RuntimeSequencerModuleConfig> {
  public constructor(@inject("runtime") private readonly chain: Runtime<any>) {
    super();
  }

  public get defaultConfig(): FlipOptional<RuntimeSequencerModuleConfig> {
    return {
      proofsEnabled: true,
    };
  }

  public async start(): Promise<void> {

    this.chain.setProofsEnabled(this.config.proofsEnabled);

  }
}
