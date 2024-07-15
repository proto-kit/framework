// accept handlers, create context with dependencies - such as prisma client
// fetch blocks from indexer, pass to handlers
// keep track of the last indexed block processed
// create storage services for storing the last indexed block
// generate GQL resolvers from the schema

import { PrismaClient } from "@prisma/client";

import { HandlerContext, Handlers } from "./Handlers";
import { UnprovenBlockWithMetadata } from "@proto-kit/sequencer";

// provide prisma schema to generate gql resolvers & client in the context
export class Processor {
  public client: PrismaClient;

  public constructor(public handlers: Handlers) {
    this.client = new PrismaClient();
  }

  public async process(block: UnprovenBlockWithMetadata) {
    // possibly do this in start()
    this.client.$connect();

    // this blows up if there's a transactional issue, needs to be handled
    await this.client.$transaction(async (transaction) => {
      // await this.handlers.onBlock({ orm: transaction }, block);
      // // once all processing is done successfully, save the block in the processor's db
      // // to mark it as processed
      // await transaction.block.create({
      //   data: {
      //     height: Number(block.block.height.toString()),
      //   },
      // });
    });

    // should happen on close() or some form of cleanup like in the sequencer
    this.client.$disconnect();
  }
}
