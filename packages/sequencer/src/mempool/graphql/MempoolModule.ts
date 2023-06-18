/* eslint-disable import/no-unused-modules */
import {
  sequencerModule,
  SequencerModule,
} from "../../sequencer/builder/SequencerModule.js";
import { Mempool } from "../Mempool";
import { GraphqlServer } from "../../graphql/GraphqlServer";

import { MempoolResolver } from "./MempoolResolver.js";

interface MempoolConfig {
  mempool: Mempool;
}

@sequencerModule()
export class MempoolModule extends SequencerModule<MempoolConfig> {
  public constructor(private readonly graphqlServer: GraphqlServer) {
    super();
  }

  public async start(): Promise<void> {
    const { mempool } = this.config;
    this.graphqlServer.registerModule(new MempoolResolver(mempool));
  }
}
