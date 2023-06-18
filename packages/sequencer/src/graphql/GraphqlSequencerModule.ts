/* eslint-disable import/no-unused-modules */
import { inject } from "tsyringe";

import {
  sequencerModule,
  SequencerModule,
} from "../sequencer/builder/SequencerModule.js";

import { GraphqlServer } from "./GraphqlServer.js";

export interface GraphQLServerModuleConfig {
  port: number;
  host: string;
}

@sequencerModule()
export class GraphQLServerModule extends SequencerModule<GraphQLServerModuleConfig> {
  public constructor(
    @inject("GraphqlServer") private readonly server: GraphqlServer
  ) {
    super();
  }

  public async start() {
    await this.server.start(this.config);
  }
}
