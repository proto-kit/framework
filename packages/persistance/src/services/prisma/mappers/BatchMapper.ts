import { injectable, singleton } from "tsyringe";
import { ObjectMapper } from "../../../ObjectMapper";
import { ComputedBlock, TransactionExecutionResult } from "@proto-kit/sequencer";
import { Batch, Block } from "@prisma/client";
import { BlockMapper } from "./BlockMapper";
import { JsonProof, Proof } from "o1js";

@singleton()
export class BatchMapper implements ObjectMapper<ComputedBlock, [Batch, string[]]> {
  public constructor(private readonly blockMapper: BlockMapper) {
  }

  public mapIn(input: [Batch, string[]]): ComputedBlock {
    return {
      bundles: input[1],
      proof: input[0].proof as JsonProof
    };
  }

  public mapOut(input: ComputedBlock): [Batch, string[]] {
    const batch: Batch = {
      proof: input.proof,
      // TODO
      height: 0
    }
    return [batch, []];
  }
}