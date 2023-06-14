import { buildSchemaSync } from "type-graphql";
import { container, injectable, injectAll } from "tsyringe";
import { FastifyRegisterOptions, fastify } from "fastify";
import mercurius, { MercuriusOptions } from "mercurius";

import type { GraphqlModule } from "./GraphqlModule.js";

interface GraphqlServerOptions {
  host: string;
  port: number;
}

@injectable()
export class GraphqlServer {
  private readonly modules: GraphqlModule[] = [];

  // public constructor(@injectAll("GraphqlModule") modules: GraphqlModule[]) {
  //   this.modules = modules;
  // }

  public registerModule(module: GraphqlModule) {
    this.modules.push(module);
  }

  public async start({ host, port }: GraphqlServerOptions) {
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

    const app = fastify();

    const options: FastifyRegisterOptions<MercuriusOptions> = {
      schema,
      graphiql: true,
    };

    await app.register(mercurius, options);

    await app.listen({ port, host });
  }
}
