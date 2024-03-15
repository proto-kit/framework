import { Settlement, SettlementStorage } from "@proto-kit/sequencer";
import { inject, injectable } from "tsyringe";

import type { PrismaConnection } from "../../PrismaDatabaseConnection";

import { SettlementMapper } from "./mappers/SettlementMapper";

@injectable()
export class PrismaSettlementStorage implements SettlementStorage {
  public constructor(
    @inject("Database") private readonly connection: PrismaConnection,
    private readonly settlementMapper: SettlementMapper
  ) {}

  public async pushSettlement(settlement: Settlement): Promise<void> {
    const { prismaClient } = this.connection;

    const dbSettlement = this.settlementMapper.mapOut(settlement);

    await prismaClient.settlement.create({
      data: {
        ...dbSettlement[0],
        batches: {
          connect: dbSettlement[1].map((batchHeight) => ({
            height: batchHeight,
          })),
        },
      },
      include: {
        batches: true,
      },
    });
  }
}
