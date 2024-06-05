import assert from "node:assert";

import { SequencerModule } from "@proto-kit/sequencer";
import {
  ChildContainerProvider,
  Configurable,
  log,
  ModuleContainer,
  ModulesConfig,
  ModulesRecord,
  TypedClass,
} from "@proto-kit/common";

import { GraphqlServer } from "./GraphqlServer";
import { GraphqlModule, SchemaGeneratingGraphqlModule } from "./GraphqlModule";

export type GraphqlModulesRecord = ModulesRecord<
  TypedClass<GraphqlModule<unknown>>
>;

export interface GraphqlModulesDefintion<
  GraphQLModules extends GraphqlModulesRecord,
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

    this.graphqlServer.setContainer(this.container);

    // eslint-disable-next-line guard-for-in
    for (const moduleName in this.definition.modules) {
      const moduleClass = this.definition.modules[moduleName];
      this.graphqlServer.registerModule(moduleClass);

      if (
        Object.prototype.isPrototypeOf.call(
          SchemaGeneratingGraphqlModule,
          moduleClass
        )
      ) {
        log.debug(`Registering manual schema for ${moduleName}`);
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const module = this.resolve(
          moduleName
        ) as SchemaGeneratingGraphqlModule<unknown>;
        this.graphqlServer.registerSchema(module.generateSchema());
      }
    }
    void this.graphqlServer.startServer();
  }
}
