import { singleton } from "tsyringe";
import { ComputedBlock } from "@proto-kit/sequencer";
import { Batch } from "@prisma/client";
import { JsonProof } from "o1js";

import { ObjectMapper } from "../../../ObjectMapper";

@singleton()
export class BatchMapper
  implements ObjectMapper<ComputedBlock, [Batch, string[]]>
{
  public constructor() {}

  public mapIn(input: [Batch, string[]]): ComputedBlock {
    return {
      bundles: input[1],
      proof: input[0].proof as JsonProof,
    };
  }

  public mapOut(input: ComputedBlock): [Batch, string[]] {
    const batch: Batch = {
      proof: input.proof,
      // TODO
      height: 0,
    };
    return [batch, []];
  }
}
