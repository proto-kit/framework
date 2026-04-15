import { Closeable, closeable, SequencerModule } from "@proto-kit/sequencer";
import {
  ChildContainerProvider,
  CombinedModuleContainerConfig,
  dependencyFactory,
  log,
  ModuleContainer,
  ModulesRecord,
  TypedClass,
} from "@proto-kit/common";

import {
  GraphqlModule,
  ResolverFactoryGraphqlModule,
  SchemaGeneratingGraphqlModule,
} from "./GraphqlModule";
import { GraphqlServer, GraphqlServerOptions } from "./GraphqlServer";

export type GraphqlModulesRecord = ModulesRecord<
  TypedClass<GraphqlModule<unknown>>
>;

export type GraphqlSequencerModuleConfig<
  GraphQLModules extends GraphqlModulesRecord,
> = CombinedModuleContainerConfig<GraphQLModules, GraphqlServerOptions>;

@closeable()
@dependencyFactory()
export class GraphqlSequencerModule<GraphQLModules extends GraphqlModulesRecord>
  extends ModuleContainer<GraphQLModules, GraphqlServerOptions>
  implements
    SequencerModule<
      CombinedModuleContainerConfig<GraphQLModules, GraphqlServerOptions>
    >,
    Closeable
{
  private graphqlServer!: GraphqlServer;

  public static from<GraphQLModules extends GraphqlModulesRecord>(
    definition: GraphQLModules
  ): TypedClass<GraphqlSequencerModule<GraphQLModules>> {
    return class ScopedGraphQlContainer extends GraphqlSequencerModule<GraphQLModules> {
      public constructor() {
        super(definition);
      }
    };
  }

  public static dependencies() {
    return {
      graphqlServer: {
        useClass: GraphqlServer,
      },
    };
  }

  public constructor(definition: GraphQLModules) {
    super(definition);
  }

  private getGraphqlConfig(graphqlServer: GraphqlServer): GraphqlServerOptions {
    try {
      return graphqlServer.config;
    } catch {
      return this.containerConfig;
    }
  }

  public create(childContainerProvider: ChildContainerProvider) {
    super.create(childContainerProvider);
    this.graphqlServer = this.container.resolve("GraphqlServer");
    this.graphqlServer.setContainer(this.container);
    this.graphqlServer.config = this.getGraphqlConfig(this.graphqlServer);
  }

  public async start(): Promise<void> {
    // eslint-disable-next-line guard-for-in
    for (const moduleName in this.definition) {
      const moduleClass = this.definition[moduleName];

      if (
        Object.prototype.isPrototypeOf.call(
          ResolverFactoryGraphqlModule,
          moduleClass
        )
      ) {
        log.debug(`Registering resolvers factory from ${moduleName}`);
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const module = this.resolve(
          moduleName
        ) as ResolverFactoryGraphqlModule<unknown>;
        // eslint-disable-next-line no-await-in-loop
        this.graphqlServer.registerResolvers(await module.resolvers());
      } else {
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
    }
    await this.graphqlServer.startServer();
  }

  public async close() {
    if (this.graphqlServer !== undefined) {
      await this.graphqlServer.close();
    }
  }
}
