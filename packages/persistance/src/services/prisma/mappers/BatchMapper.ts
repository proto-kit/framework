import { singleton } from "tsyringe";
import { Batch } from "@proto-kit/sequencer";
import { Batch as PrismaBatch } from "@prisma/client";
import { JsonProof } from "o1js";

import { ObjectMapper } from "../../../ObjectMapper";

@singleton()
export class BatchMapper
  implements ObjectMapper<Batch, [PrismaBatch, string[]]>
{
  public mapIn(input: [PrismaBatch, string[]]): Batch {
    return {
      blockHashes: input[1],
      proof: input[0].proof as JsonProof,
      height: input[0].height,
    };
  }

  public mapOut(input: Batch): [PrismaBatch, string[]] {
    const batch: PrismaBatch = {
      proof: input.proof,
      height: input.height,
      settlementTransactionHash: null,
    };
    return [batch, []];
  }
}
