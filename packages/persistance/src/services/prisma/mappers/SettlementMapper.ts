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
      transactionId: settlement.transactionId,
      promisedMessagesHash: settlement.promisedMessagesHash,
    };
  }

  public mapOut(input: Settlement): [DBSettlement, number[]] {
    return [
      {
        promisedMessagesHash: input.promisedMessagesHash,
        transactionId: input.transactionId,
      },
      input.batches,
    ];
  }
}
//
