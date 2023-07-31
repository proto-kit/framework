import { BaseLayer, SequencerModule, sequencerModule } from "../../../src";
import { ComputedBlock } from "../../../src/storage/model/Block";

@sequencerModule()
export class NoopBaseLayer extends SequencerModule<{}> implements BaseLayer {

  public async blockProduced(block: ComputedBlock): Promise<void> {
  }

  public async start(): Promise<void> {
  }

}