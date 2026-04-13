import { buildSchemaSync, NonEmptyArray } from "type-graphql";
import { Closeable, closeable, SequencerModule } from "@proto-kit/sequencer";
import {
  ChildContainerProvider,
  CombinedModuleContainerConfig,
  log,
  ModuleContainer,
  ModulesRecord,
  TypedClass,
} from "@proto-kit/common";
import { GraphQLSchema } from "graphql/type";
import { stitchSchemas } from "@graphql-tools/stitch";
import { createYoga } from "graphql-yoga";
import Koa from "koa";

import {
  GraphqlModule,
  ResolverFactoryGraphqlModule,
  SchemaGeneratingGraphqlModule,
} from "./GraphqlModule";

export type GraphqlModulesRecord = ModulesRecord<
  TypedClass<GraphqlModule<unknown>>
>;

export interface GraphqlServerConfig {
  host: string;
  port: number;
  graphiql: boolean;
}

export type GraphqlSequencerModuleConfig<
  GraphQLModules extends GraphqlModulesRecord,
> = CombinedModuleContainerConfig<GraphQLModules, GraphqlServerConfig>;

type Server = ReturnType<Koa["listen"]>;

function assertArrayIsNotEmpty<T>(
  array: readonly T[],
  errorMessage: string
): asserts array is NonEmptyArray<T> {
  if (array.length === 0) {
    throw new Error(errorMessage);
  }
}

@closeable()
export class GraphqlSequencerModule<GraphQLModules extends GraphqlModulesRecord>
  extends ModuleContainer<GraphQLModules, GraphqlServerConfig>
  implements
    SequencerModule<
      CombinedModuleContainerConfig<GraphQLModules, GraphqlServerConfig>
    >,
    Closeable
{
  private readonly modules: TypedClass<GraphqlModule<unknown>>[] = [];

  private readonly schemas: GraphQLSchema[] = [];

  private resolvers: NonEmptyArray<Function> | undefined;

  private server?: Server;

  private context: {} = {};

  public get serverConfig(): GraphqlServerConfig {
    return this.containerConfig;
  }

  public static from<GraphQLModules extends GraphqlModulesRecord>(
    definition: GraphQLModules
  ): TypedClass<GraphqlSequencerModule<GraphQLModules>> {
    return class ScopedGraphQlContainer extends GraphqlSequencerModule<GraphQLModules> {
      public constructor() {
        super(definition);
      }
    };
  }

  public constructor(definition: GraphQLModules) {
    super(definition);
  }

  public setContext(newContext: {}) {
    this.context = newContext;
  }

  public registerResolvers(resolvers: NonEmptyArray<Function>) {
    if (this.resolvers === undefined) {
      this.resolvers = resolvers;
    } else {
      this.resolvers = [...this.resolvers, ...resolvers];
    }
  }

  public create(childContainerProvider: ChildContainerProvider) {
    super.create(childContainerProvider);
    this.container.register("GraphqlServer", { useValue: this });
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
        this.registerResolvers(await module.resolvers());
      } else {
        this.modules.push(moduleClass);

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
          this.schemas.push(module.generateSchema());
        }
      }
    }
    await this.startServer();
  }

  // Server logic

  private async startServer() {
    const { modules, container: dependencyContainer } = this;

    const resolvers = [...modules, ...(this.resolvers || [])];

    assertArrayIsNotEmpty(
      resolvers,
      "At least one module has to be provided to GraphqlServer"
    );

    // Building schema
    const resolverSchema = buildSchemaSync({
      resolvers,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      container: { get: (cls) => dependencyContainer.resolve(cls) },
      validate: {
        enableDebugMessages: true,
      },
    });

    // Instantiate all modules at startup
    modules.forEach((module) => {
      dependencyContainer.resolve(module);
    });

    const schema = [resolverSchema, ...this.schemas].reduce(
      (schema1, schema2) =>
        stitchSchemas({
          subschemas: [{ schema: schema1 }, { schema: schema2 }],
        })
    );

    const app = new Koa();

    const { graphiql, port, host } = this.serverConfig;

    const yoga = createYoga<Koa.ParameterizedContext>({
      schema,
      graphiql,
      context: this.context,
    });

    // Bind GraphQL Yoga to `/graphql` endpoint
    app.use(async (ctx) => {
      // Second parameter adds Koa's context into GraphQL Context
      const response = await yoga.handleNodeRequest(ctx.req, ctx);

      // Set status code
      ctx.status = response.status;

      // Set headers
      response.headers.forEach((value, key) => {
        ctx.append(key, value);
      });

      // Converts ReadableStream to a NodeJS Stream
      ctx.body = response.body;
    });

    this.server = app.listen({ port, host }, () => {
      log.info(`GraphQL Server listening on ${host}:${port}`);
    });
  }

  public async close() {
    if (this.server !== undefined) {
      const { server } = this;

      await new Promise<void>((res) => {
        server.close((error) => {
          if (error !== undefined) {
            log.error(error);
          }
          res();
        });
      });
    }
  }
}
