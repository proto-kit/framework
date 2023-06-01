import { inject } from "tsyringe";
import { sequencerModule, SequencerModule } from "../runtime/builder/SequencerModule.js";
import { GraphqlServer } from "./GraphqlServer.js";
import { FlipOptional } from "@yab/protocol";

export type GraphQLServerModuleConfig = {
  port: number, // Required values
  host?: string // Optional values (have to provided via defaultConfig()
}

@sequencerModule()
export class GraphQLServerModule extends SequencerModule<GraphQLServerModuleConfig> {

  public constructor(
    @inject("GraphqlServer") private readonly server: GraphqlServer
  ) {
    super();
  }

  public get defaultConfig(): FlipOptional<GraphQLServerModuleConfig> {
    return {
      host: "localhost",
      // port can be omitted here, since it has to be provided by the user
    };
  }

  public async start() {
    await this.server.start(this.config)

    //Do this and that
  }

}