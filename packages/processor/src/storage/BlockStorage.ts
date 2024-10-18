import { NoConfig } from "@proto-kit/common";
import { inject, injectable } from "tsyringe";

import { ProcessorModule } from "../ProcessorModule";
import { BasePrismaClient } from "../handlers/BasePrismaClient";

import { PrismaDatabaseConnection } from "./PrismaDatabaseConnection";

@injectable()
export class BlockStorage extends ProcessorModule<NoConfig> {
  public constructor(
    @inject("Database")
    public database: PrismaDatabaseConnection<BasePrismaClient>
  ) {
    super();
  }

  public async getLastProcessedBlockHeight(): Promise<number | undefined> {
    const [block] = await this.database.prismaClient.block.findMany({
      orderBy: { height: "desc" },
      take: 1,
    });

    return block?.height;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public async start() {}
}
