import { singleton } from "tsyringe";
import { BlockResult } from "@proto-kit/sequencer";
import { BlockResult as DBBlockResult, Prisma } from "@prisma/client";
import {
  BlockHashMerkleTreeWitnessJson,
  NetworkState,
} from "@proto-kit/protocol";

import { ObjectMapper } from "../../../ObjectMapper";

import { StateTransitionArrayMapper } from "./StateTransitionMapper";

@singleton()
export class BlockResultMapper
  implements ObjectMapper<BlockResult, DBBlockResult>
{
  public constructor(
    private readonly stArrayMapper: StateTransitionArrayMapper
  ) {}

  public mapIn(input: DBBlockResult): BlockResult {
    return {
      afterNetworkState: input.afterNetworkState as NetworkState,

      stateRoot: input.stateRoot,
      blockHashRoot: input.blockHashRoot,
      blockHashWitness:
        input.blockHashWitness as BlockHashMerkleTreeWitnessJson,

      afterBlockStateTransitions: this.stArrayMapper
        .mapIn(input.afterBlockStateTransitions)
        .map((st) => st),
      blockHash: input.blockHash,

      witnessedRoots: [input.witnessedRoots[0]],
    };
  }

  public mapOut(input: BlockResult): DBBlockResult {
    return {
      stateRoot: input.stateRoot.toString(),
      blockHash: input.blockHash.toString(),
      blockHashRoot: input.blockHashRoot.toString(),

      blockHashWitness: input.blockHashWitness,
      afterBlockStateTransitions:
        input.afterBlockStateTransitions as unknown as Prisma.JsonArray,
      afterNetworkState: input.afterNetworkState,

      witnessedRoots: [input.witnessedRoots[0].toString()],
    };
  }
}
