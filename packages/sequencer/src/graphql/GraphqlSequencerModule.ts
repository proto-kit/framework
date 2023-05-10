import { injectable } from "tsyringe";
import { SequencerModule } from "../runtime/builder/SequencerModule.js";
import { SequencerBuilder } from "../runtime/builder/SequencerBuilder.js";
import { Sequencer } from "../runtime/executor/Sequencer.js";
import { sequencerConfig } from "../index.js";
import { GraphqlServer } from "./GraphqlServer.js";

type GraphQLServerModuleConfig = {
  port: number,
  host: string
}

@injectable()
export class GraphQLServerModule extends SequencerModule {

  public constructor(
    @sequencerConfig() private readonly config: GraphQLServerModuleConfig,
    private readonly server: GraphqlServer
  ) {
    super();
  }

  public bind(_: SequencerBuilder): void {
    
  }

  public readonly name = "GraphQLServerModule";

  public async start(_: Sequencer) {
    await this.server.start()
  }

}