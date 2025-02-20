import { singleton } from "tsyringe";
import { BlockResult } from "@proto-kit/sequencer";
import { BlockResult as DBBlockResult } from "@prisma/client";
import { BlockHashMerkleTreeWitness, NetworkState } from "@proto-kit/protocol";

import { ObjectMapper } from "../../../ObjectMapper";

import { StateTransitionBatchArrayMapper } from "./StateTransitionMapper";

@singleton()
export class BlockResultMapper
  implements
    ObjectMapper<
      Omit<BlockResult, "afterBlockStateTransitions">,
      DBBlockResult
    >
{
  public constructor(
    private readonly stArrayMapper: StateTransitionBatchArrayMapper
  ) {}

  public mapIn(
    input: DBBlockResult
  ): Omit<BlockResult, "afterBlockStateTransitions"> {
    return {
      afterNetworkState: new NetworkState(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        NetworkState.fromJSON(input.afterNetworkState as any)
      ),

      stateRoot: BigInt(input.stateRoot),
      blockHashRoot: BigInt(input.blockHashRoot),
      blockHashWitness: new BlockHashMerkleTreeWitness(
        BlockHashMerkleTreeWitness.fromJSON(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          input.blockHashWitness as any
        )
      ),
      blockHash: BigInt(input.blockHash),

      witnessedRoots: [BigInt(input.witnessedRoots[0])],
    };
  }

  public mapOut(
    input: Omit<BlockResult, "afterBlockStateTransitions">
  ): DBBlockResult {
    return {
      stateRoot: input.stateRoot.toString(),
      blockHash: input.blockHash.toString(),
      blockHashRoot: input.blockHashRoot.toString(),

      blockHashWitness: BlockHashMerkleTreeWitness.toJSON(
        input.blockHashWitness
      ),
      afterNetworkState: NetworkState.toJSON(input.afterNetworkState),

      witnessedRoots: [input.witnessedRoots[0].toString()],
    };
  }
}
