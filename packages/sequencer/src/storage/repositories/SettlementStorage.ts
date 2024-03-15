import { Settlement } from "../model/Settlement";

export interface SettlementStorage {
  pushSettlement: (settlement: Settlement) => Promise<void>;
}
