import { buildSchemaSync } from "type-graphql";
import { DependencyContainer, injectable } from "tsyringe";

import type { GraphqlModule } from "./GraphqlModule";
import { SequencerModule } from "@proto-kit/sequencer/dist/sequencer/builder/SequencerModule";
import { log, noop } from "@proto-kit/common";
import { GraphQLSchema } from "graphql/type";
import { stitchSchemas } from "@graphql-tools/stitch";
import { createYoga } from "graphql-yoga";
import Koa from "koa";

interface GraphqlServerOptions {
  host: string;
  port: number;
}

@injectable()
export class GraphqlServer extends SequencerModule<GraphqlServerOptions> {
  private readonly modules: GraphqlModule<unknown>[] = [];

  private readonly schemas: GraphQLSchema[] = [];

  private dependencyContainer?: DependencyContainer;

  public setContext(container: DependencyContainer) {
    this.dependencyContainer = container;
  }

  private assertDependencyContainerSet(
    container: DependencyContainer | undefined
  ): asserts container is DependencyContainer {
    if (container === undefined) {
      throw new Error("DependencyContainer for GraphqlServer not set");
    }
  }

  public registerModule(module: GraphqlModule<unknown>) {
    this.modules.push(module);
  }

  public registerSchema(schema: GraphQLSchema) {
    this.schemas.push(schema);
  }

  public async start() {
    noop();
  }

  public async startServer() {
    const { dependencyContainer, modules } = this;
    this.assertDependencyContainerSet(dependencyContainer);

    // Building schema
    const resolverSchema = buildSchemaSync({
      resolvers: [
        modules[0].resolverType,
        ...modules.slice(1).map((x) => x.resolverType),
      ],

      // resolvers: [MempoolResolver as Function],
      // eslint-disable-next-line max-len
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-return
      container: { get: (cls) => dependencyContainer.resolve(cls) },

      validate: {
        enableDebugMessages: true,
      },
    });

    const schema = [resolverSchema, ...this.schemas].reduce(
      (schema1, schema2) => {
        return stitchSchemas({
          subschemas: [{ schema: schema1 }, { schema: schema2 }],
        });
      }
    );

    const app = new Koa();

    const yoga = createYoga<Koa.ParameterizedContext>({
      schema: schema,
      graphiql: true,
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

    app.listen({ port, host }, () => {
      log.info(`GraphQL Server listening on ${host}:${port}`);
    });
  }
}
