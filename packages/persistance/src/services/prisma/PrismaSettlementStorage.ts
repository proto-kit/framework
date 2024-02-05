import { Settlement, SettlementStorage } from "@proto-kit/sequencer";
import { inject } from "tsyringe";
import { PrismaDatabaseConnection } from "../../PrismaDatabaseConnection";
import { TransactionMapper } from "./mappers/TransactionMapper";
import { SettlementMapper } from "./mappers/SettlementMapper";

export class PrismaSettlementStorage implements SettlementStorage {
  public constructor(
    @inject("Database") private readonly connection: PrismaDatabaseConnection,
    private readonly settlementMapper: SettlementMapper
  ) {}

  public async pushSettlement(settlement: Settlement): Promise<void> {
    const { client } = this.connection;

    const dbSettlement = this.settlementMapper.mapOut(settlement);

    await client.settlement.create({
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
