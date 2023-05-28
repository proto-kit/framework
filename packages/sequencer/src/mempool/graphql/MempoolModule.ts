import { MempoolResolver } from "./MempoolResolver.js";
import { SequencerModule } from "../../runtime/builder/SequencerModule.js";
import { Mempool } from "../Mempool";
import { FlipOptional } from "../../runtime/builder/Types";
import { inject } from "tsyringe";
import { GraphqlServer } from "../../graphql/GraphqlServer";

interface MempoolConfig {
  mempool: Mempool
}

export class MempoolModule extends SequencerModule<MempoolConfig> {

  constructor(@inject("GraphqlServer") private readonly graphqlServer: GraphqlServer) {
    super();
  }

  public async start(config: MempoolConfig): Promise<void> {
    const { mempool } = config;
    // builder.getContainer().registerInstance<GraphqlModule>("GraphqlModule", new MempoolResolver(mempool));
    this.graphqlServer.registerModule(new MempoolResolver(mempool))
  }

  get defaultConfig(): FlipOptional<MempoolConfig> {
    return { };
  }
}