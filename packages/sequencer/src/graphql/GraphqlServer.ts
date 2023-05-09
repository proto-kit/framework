import { buildSchema } from "type-graphql";
import { container, injectable, injectAll } from "tsyringe";
import type { GraphqlModule } from "./GraphqlModule.js";
import { createYoga } from "graphql-yoga";
import express from "express";

@injectable()
export class GraphqlServer {

  private readonly modules: GraphqlModule[];

  public constructor(@injectAll("GraphqlModule") modules: GraphqlModule[]) {
    this.modules = modules;
  }

  public async start() {
    // Building schema
    const schema = await buildSchema({
      resolvers: [this.modules[0].resolverType, ...this.modules.slice(1).map(x => x.resolverType)],

      // resolvers: [MempoolResolver as Function],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      container: { get: (cls) => container.resolve(cls) },

      validate: {
        enableDebugMessages: true
      }
    });

    const yoga = createYoga({ schema, graphiql: true });

    const server = express();

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    server.use("/graphql", yoga);

    server.listen(8080, () => {
      console.log("Running a GraphQL API server at http://localhost:8080/graphql");
    });
  }

}