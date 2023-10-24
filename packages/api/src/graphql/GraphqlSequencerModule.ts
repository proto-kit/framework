import { SequencerModule } from "@proto-kit/sequencer/dist/sequencer/builder/SequencerModule.js";

import {
  ChildContainerProvider,
  Configurable,
  log,
  ModuleContainer,
  ModulesConfig,
  ModulesRecord,
  StringKeyOf,
  TypedClass,
} from "@proto-kit/common";
import { GraphqlServer } from "./GraphqlServer";
import { GraphqlModule, SchemaGeneratingGraphqlModule } from "./GraphqlModule";
import assert from "assert";

export type GraphqlModulesRecord = ModulesRecord<any>;

export interface GraphqlModulesDefintion<
  GraphQLModules extends GraphqlModulesRecord
> {
  modules: GraphQLModules;
  config?: ModulesConfig<GraphQLModules>;
}

export class GraphqlSequencerModule<GraphQLModules extends GraphqlModulesRecord>
  extends ModuleContainer<GraphQLModules>
  implements Configurable<unknown>, SequencerModule<unknown>
{
  public static from<GraphQLModules extends GraphqlModulesRecord>(
    definition: GraphqlModulesDefintion<GraphQLModules>
  ): TypedClass<GraphqlSequencerModule<GraphQLModules>> {
    return class ScopedGraphQlContainer extends GraphqlSequencerModule<GraphQLModules> {
      public constructor() {
        super(definition);
      }
    };
  }

  private graphqlServer?: GraphqlServer;

  public create(childContainerProvider: ChildContainerProvider) {
    super.create(childContainerProvider);

    this.graphqlServer = this.container.resolve("GraphqlServer");
  }

  public async start(): Promise<void> {
    assert(this.graphqlServer !== undefined);

    this.graphqlServer.setContext(this.container);

    // eslint-disable-next-line guard-for-in
    for (const moduleName in this.definition.modules) {
      const module: GraphqlModule<unknown> = this.resolve(moduleName);
      this.graphqlServer.registerModule(module);

      if (module instanceof SchemaGeneratingGraphqlModule) {
        log.debug(`Registering manual schema for ${moduleName}`);
        this.graphqlServer.registerSchema(module.generateSchema());
      }
    }
    void this.graphqlServer.startServer();
  }
}
