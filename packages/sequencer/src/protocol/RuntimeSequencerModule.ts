import { SequencerModule } from "../runtime/builder/SequencerModule";
import { inject } from "tsyringe";
import { Runtime } from "@yab/module";
import { FlipOptional } from "@yab/protocol";

interface RuntimeSequencerModuleConfig {}

export class RuntimeSequencerModule extends SequencerModule<RuntimeSequencerModuleConfig> {

  constructor(@inject("runtime") private readonly chain: Runtime<any>) {
    super();
  }

  get defaultConfig(): FlipOptional<RuntimeSequencerModuleConfig> {
    return {};
  }

  start(): Promise<void> {
    return Promise.resolve(undefined);
  }
}
