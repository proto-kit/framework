import { ComputedBlock } from "../../storage/model/Block";
import {
  SequencerModule,
  sequencerModule,
} from "../../sequencer/builder/SequencerModule";

import { BaseLayer } from "./BaseLayer";

@sequencerModule()
export class NoopBaseLayer extends SequencerModule<{}> implements BaseLayer {
  public async blockProduced(block: ComputedBlock): Promise<void> {}

  public async start(): Promise<void> {}
}
