import { buildSchemaSync } from "type-graphql";
import { container, injectable } from "tsyringe";
import { FastifyRegisterOptions, fastify } from "fastify";
import mercurius, { MercuriusOptions } from "mercurius";

import type { GraphqlModule } from "./GraphqlModule";
import { SequencerModule } from "../sequencer/builder/SequencerModule";
import { noop } from "@proto-kit/common";

interface GraphqlServerOptions {
  host: string;
  port: number;
}

@injectable()
export class GraphqlServer extends SequencerModule<GraphqlServerOptions> {
  private readonly modules: GraphqlModule<unknown>[] = [];

  // public constructor(@injectAll("GraphqlModule") modules: GraphqlModule[]) {
  //   this.modules = modules;
  // }

  public registerModule(module: GraphqlModule<unknown>) {
    this.modules.push(module);
  }

  public async start() {
    noop();
  }

  public async startServer() {
    // Building schema
    const schema = buildSchemaSync({
      resolvers: [
        this.modules[0].resolverType,
        ...this.modules.slice(1).map((x) => x.resolverType),
      ],

      // resolvers: [MempoolResolver as Function],
      // eslint-disable-next-line max-len
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-return
      container: { get: (cls) => container.resolve(cls) },

      validate: {
        enableDebugMessages: true,
      },
    });

    const app = fastify({ logger: { level: 'info' } });

    const options: FastifyRegisterOptions<MercuriusOptions> = {
      schema,
      graphiql: true,

      errorFormatter: (executionResult, context) => {
        const log = context.reply ? context.reply.log : context.app.log;
        const errors = executionResult.errors.map((error) => {
          error.extensions.exception = error.originalError;
          Object.defineProperty(error, "extensions", { enumerable: true });
          return error;
        });
        log.info({ err: executionResult.errors }, "Argument Validation Error");
        return {
          statusCode: 201,

          response: {
            data: executionResult.data,
            errors,
          },
        };
      },
    };

    await app.register(mercurius, options);

    const { port, host } = this.config;

    await app.listen({ port, host });
  }
}
