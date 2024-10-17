import { buildSchemaSync, NonEmptyArray } from "type-graphql";
import { DependencyContainer, injectable } from "tsyringe";
import { SequencerModule } from "@proto-kit/sequencer";
import { log, noop, TypedClass } from "@proto-kit/common";
import { GraphQLSchema } from "graphql/type";
import { stitchSchemas } from "@graphql-tools/stitch";
import { createYoga } from "graphql-yoga";
import Koa from "koa";

import type { GraphqlModule } from "./GraphqlModule";

type Server = ReturnType<Koa["listen"]>;

interface GraphqlServerOptions {
  host: string;
  port: number;
  graphiql: boolean;
}

function assertArrayIsNotEmpty<T>(
  array: readonly T[],
  errorMessage: string
): asserts array is NonEmptyArray<T> {
  if (array.length === 0) {
    throw new Error(errorMessage);
  }
}

@injectable()
export class GraphqlServer extends SequencerModule<GraphqlServerOptions> {
  private readonly modules: TypedClass<GraphqlModule<unknown>>[] = [];

  private readonly schemas: GraphQLSchema[] = [];

  private resolvers: NonEmptyArray<Function> | undefined;

  private dependencyContainer?: DependencyContainer;

  private server?: Server;

  private context: {} = {};

  public setContainer(container: DependencyContainer) {
    this.dependencyContainer = container;
  }

  private assertDependencyContainerSet(
    container: DependencyContainer | undefined
  ): asserts container is DependencyContainer {
    if (container === undefined) {
      throw new Error("DependencyContainer for GraphqlServer not set");
    }
  }

  public registerModule(module: TypedClass<GraphqlModule<unknown>>) {
    this.modules.push(module);
  }

  public registerSchema(schema: GraphQLSchema) {
    this.schemas.push(schema);
  }

  public registerResolvers(resolvers: NonEmptyArray<Function>) {
    if (this.resolvers === undefined) {
      this.resolvers = resolvers;
    } else {
      this.resolvers = [...this.resolvers, ...resolvers];
    }
  }

  public setContext(context: {}) {
    this.context = context;
  }

  public async start() {
    noop();
  }

  public async startServer() {
    const { dependencyContainer, modules } = this;
    this.assertDependencyContainerSet(dependencyContainer);

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

    // TODO Injection token of Graphql Container not respected atm, only class is used

    // Instantiate all modules at startup
    modules.forEach((module) => {
      dependencyContainer?.resolve(module);
    });

    const schema = [resolverSchema, ...this.schemas].reduce(
      (schema1, schema2) =>
        stitchSchemas({
          subschemas: [{ schema: schema1 }, { schema: schema2 }],
        })
    );

    const app = new Koa();

    const yoga = createYoga<Koa.ParameterizedContext>({
      schema,
      graphiql: this.config.graphiql,
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

    const { port, host } = this.config;

    this.server = app.listen({ port, host }, () => {
      log.info(`GraphQL Server listening on ${host}:${port}`);
    });
  }

  public close() {
    this.server?.close();
  }
}
