import { PrismaClient } from "@prisma/client";
import { UnprovenBlockWithMetadata } from "@proto-kit/sequencer";

export interface HandlerContext {
  orm: Omit<
    PrismaClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
  >;
}

export interface Handlers {
  onBlock: (
    context: HandlerContext,
    block: UnprovenBlockWithMetadata
  ) => Promise<void>;
}
