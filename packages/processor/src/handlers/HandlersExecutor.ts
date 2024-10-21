import { ChildContainerProvider, TypedClass } from "@proto-kit/common";
import { BlockWithResult } from "@proto-kit/sequencer";
import { injectable } from "tsyringe";

import { ProcessorModule } from "../ProcessorModule";
import { PrismaDatabaseConnection } from "../storage/PrismaDatabaseConnection";

import { BasePrismaClient } from "./BasePrismaClient";

export type ClientTransaction<PrismaClient extends BasePrismaClient> =
  Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export type BlockHandler<PrismaClient extends BasePrismaClient> = (
  client: ClientTransaction<PrismaClient>,
  block: BlockWithResult
) => Promise<void>;

export interface HandlersRecord<PrismaClient extends BasePrismaClient> {
  onBlock: BlockHandler<PrismaClient>[];
}

export interface HandlersExecutorConfig {
  maxWait?: number;
  timeout?: number;
}

@injectable()
export class HandlersExecutor<
  PrismaClient extends BasePrismaClient,
  Handlers extends HandlersRecord<PrismaClient>,
> extends ProcessorModule<HandlersExecutorConfig> {
  public isExecuting = false;

  public handlers: Handlers | undefined;

  public database: PrismaDatabaseConnection<PrismaClient> | undefined;

  public create(childContainerProvider: ChildContainerProvider): void {
    const container = childContainerProvider();
    const db: PrismaDatabaseConnection<PrismaClient> =
      container.resolve("Database");
    this.database = db;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public async start() {}

  public static from<
    PrismaClient extends BasePrismaClient,
    Handlers extends HandlersRecord<PrismaClient>,
  >(handlers: Handlers): TypedClass<HandlersExecutor<PrismaClient, Handlers>> {
    return class ScopedHandlers extends HandlersExecutor<
      PrismaClient,
      Handlers
    > {
      public handlers = handlers;
    };
  }

  public async onBlock(
    client: ClientTransaction<PrismaClient>,
    block: BlockWithResult
  ) {
    if (this.handlers?.onBlock) {
      for (const handler of this.handlers.onBlock) {
        // eslint-disable-next-line no-await-in-loop
        await handler(client, block);
      }
    }
  }

  public async onAfterHandlers(
    client: ClientTransaction<PrismaClient>,
    block: BlockWithResult
  ) {
    await client.block.create({
      data: {
        height: Number(block.block.height.toBigInt()),
      },
    });
  }

  public async execute(block: BlockWithResult) {
    if (!this.database) {
      throw new Error("Database connection missing from HandlersExecutor");
    }

    if (this.isExecuting) return;

    this.isExecuting = true;

    try {
      await this.database.prismaClient.$transaction(
        async (tx) => {
          await this.onBlock(tx, block);
          await this.onAfterHandlers(tx, block);
        },
        {
          maxWait: this.config.maxWait,
          timeout: this.config.timeout,
        }
      );
    } finally {
      this.isExecuting = false;
    }
  }
}
