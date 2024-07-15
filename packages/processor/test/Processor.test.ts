import "reflect-metadata";

import { Processor } from "../src/Processor";
import { Handlers } from "../src/Handlers";
import { UnprovenBlockWithMetadata } from "@proto-kit/sequencer";
import { Field } from "o1js";
import { resolvers } from "./../src/generated/type-graphql";
import { GraphqlServer } from "@proto-kit/api";
import { buildSchemaSync } from "type-graphql";
import { container } from "tsyringe";

/**
 *  start postgress for development
 * docker run --name myPostgresDb -p 5432:5432 -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -e POSTGRES_DB=processor-db -d postgres
 *
 * merge process + appchain schema
 * rm -f ./.tmp/schema.prisma && echo "$(cat ./prisma/schema/processor.prisma)" >> ./.tmp/schema.prisma  && echo "$(cat ./test/app-chain.prisma)" >> ./.tmp/schema.prisma
 * generate prisma client from the merged schema
 * npx prisma migrate dev --name init --schema=.tmp/schema.prisma
 */

export const handlers: Handlers = {
  async onBlock({ orm }, { block, metadata }) {
    await orm.balance.create({
      data: {
        height: Number(block.height.toString()),
        balance: "100",
        address: "B62",
      },
    });
  },
};

describe("Processor", () => {
  it("should process a block", async () => {
    const processor = new Processor(handlers);

    const block = UnprovenBlockWithMetadata.createEmpty();
    block.block.height = Field(1);
    await processor.process(block);

    const balances = await processor.client.balance.findMany();
    console.log("balances", balances);

    const server = new GraphqlServer();

    console.log("resolvers", resolvers);

    resolvers.forEach((resolver) => {
      const methods = Object.getOwnPropertyNames(resolver.prototype);
      methods.forEach((method) => {
        const shouldRemove =
          method.includes("update") ||
          method.includes("create") ||
          method.includes("delete") ||
          method.includes("upsert");

        if (shouldRemove) {
          console.log("deleting method", method);
          delete resolver.prototype[method];
        }
      });
    });

    const schema = buildSchemaSync({
      resolvers,
      validate: false,
    });
    server.registerSchema(schema);

    server.setContainer(container);

    server.config = {
      graphiql: true,
      host: "localhost",
      port: 4000,
    };

    server.prismaClient = processor.client;

    await server.startServer();
  });
});
