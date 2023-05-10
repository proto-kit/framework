import { Sequencer } from "../../runtime/executor/Sequencer.js";
import { MempoolResolver } from "./MempoolResolver.js";
import { SequencerModule } from "../../runtime/builder/SequencerModule.js";
import { SequencerBuilder } from "../../runtime/builder/SequencerBuilder.js";
import { GraphqlModule } from "../../graphql/GraphqlModule.js";

export class MempoolModule implements SequencerModule {
  
  public bind(builder: SequencerBuilder): void {
    const { mempool } = builder.getConfig();
    builder.getContainer().registerInstance<GraphqlModule>("GraphqlModule", new MempoolResolver(mempool));
  }

  public readonly name = "MempoolModule";

  public start(_: Sequencer) {
    return Promise.resolve()
  }
  
}