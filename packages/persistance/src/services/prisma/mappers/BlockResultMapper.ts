import { singleton } from "tsyringe";
import { BlockResult, UntypedStateTransition } from "@proto-kit/sequencer";
import { BlockResult as DBBlockResult } from "@prisma/client";
import {
  BlockHashMerkleTreeWitnessJson,
  NetworkStateJson,
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
      afterNetworkState: input.afterNetworkState as NetworkStateJson,

      stateRoot: input.stateRoot,
      blockHashRoot: input.blockHashRoot,
      blockHashWitness:
        input.blockHashWitness as BlockHashMerkleTreeWitnessJson,

      afterBlockStateTransitions: this.stArrayMapper
        .mapIn(input.afterBlockStateTransitions)
        .map((st) => st.toJSON()),
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
      afterBlockStateTransitions: this.stArrayMapper.mapOut(
        input.afterBlockStateTransitions.map((st) =>
          UntypedStateTransition.fromJSON(st)
        )
      ),
      afterNetworkState: input.afterNetworkState,

      witnessedRoots: [input.witnessedRoots[0].toString()],
    };
  }
}
