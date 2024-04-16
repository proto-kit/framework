import { injectable } from "tsyringe";
import { Settlement } from "@proto-kit/sequencer";
import { Settlement as DBSettlement } from "@prisma/client";

import { ObjectMapper } from "../../../ObjectMapper";

@injectable()
export class SettlementMapper
  implements ObjectMapper<Settlement, [DBSettlement, number[]]>
{
  public mapIn(input: [DBSettlement, number[]]): Settlement {
    const [settlement, batches] = input;
    return {
      batches,
      // TODO Add this back in after we make the transactions traceable
      // transactionHash: settlement.transactionHash,
      promisedMessagesHash: settlement.promisedMessagesHash,
    };
  }

  public mapOut(input: Settlement): [DBSettlement, number[]] {
    return [
      {
        promisedMessagesHash: input.promisedMessagesHash,
        transactionHash: "", // input.transactionHash,
      },
      input.batches,
    ];
  }
}
