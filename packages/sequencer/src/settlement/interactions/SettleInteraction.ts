import { SettleableBatch } from "../../storage/model/Batch";
import { Settlement } from "../../storage/model/Settlement";

export interface SettleInteraction {
  settle(
    batch: SettleableBatch,
    options: {
      nonce?: number;
    }
  ): Promise<Settlement>;
}
