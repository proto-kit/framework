import { buildSchemaSync } from "type-graphql";
import { container, injectable, injectAll } from "tsyringe";
// eslint-disable-next-line import/no-named-as-default
import fastify, { FastifyRegisterOptions } from "fastify";
import mercurius, { MercuriusOptions } from "mercurius";

import type { GraphqlModule } from "./GraphqlModule.js";

@injectable()
export class GraphqlServer {
  private readonly modules: GraphqlModule[];

  public constructor(@injectAll("GraphqlModule") modules: GraphqlModule[]) {
    this.modules = modules;
  }

  public async start() {
    // Building schema
    const schema = buildSchemaSync({
      resolvers: [this.modules[0].resolverType, ...this.modules.slice(1).map((x) => x.resolverType)],

      // resolvers: [MempoolResolver as Function],
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

    await app.listen({ port: 8080 });
  }
}
