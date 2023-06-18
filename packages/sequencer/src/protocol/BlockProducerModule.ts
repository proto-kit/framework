/* eslint-disable import/no-unused-modules */
import { inject } from "tsyringe";
import { Runtime } from "@yab/module";

import {
  sequencerModule,
  SequencerModule,
} from "../sequencer/builder/SequencerModule";

interface RuntimeSequencerModuleConfig {
  proofsEnabled: boolean;
}

@sequencerModule()
export class BlockProducerModule extends SequencerModule<RuntimeSequencerModuleConfig> {
  public constructor(@inject("runtime") private readonly runtime: Runtime) {
    super();
  }

  public async start(): Promise<void> {
    this.runtime.setProofsEnabled(this.config.proofsEnabled);
  }
}
