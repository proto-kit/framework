import { injectable } from "tsyringe";

import { SettlementStorage } from "../repositories/SettlementStorage";
import { Settlement } from "../model/Settlement";

@injectable()
export class InMemorySettlementStorage implements SettlementStorage {
  public settlements: Settlement[] = [];

  async pushSettlement(settlement: Settlement): Promise<void> {
    this.settlements.push(settlement);
  }
}
