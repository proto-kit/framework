import { MempoolResolver } from "./MempoolResolver.js";
import { sequencerModule, SequencerModule } from "../../runtime/builder/SequencerModule.js";
import { Mempool } from "../Mempool";
import { inject } from "tsyringe";
import { GraphqlServer } from "../../graphql/GraphqlServer";
import { FlipOptional } from "@yab/protocol";

interface MempoolConfig {
  mempool: Mempool;
}

@sequencerModule()
export class MempoolModule extends SequencerModule<MempoolConfig> {
  constructor(@inject("GraphqlServer") private readonly graphqlServer: GraphqlServer) {
    super();
  }

  public async start(): Promise<void> {
    const { mempool } = this.config;
    this.graphqlServer.registerModule(new MempoolResolver(mempool));
  }

  get defaultConfig(): FlipOptional<MempoolConfig> {
    return {};
  }
}
