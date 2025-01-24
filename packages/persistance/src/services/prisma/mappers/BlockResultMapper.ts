import { singleton } from "tsyringe";
import { BlockResult } from "@proto-kit/sequencer";
import { BlockResult as DBBlockResult } from "@prisma/client";
import { BlockHashMerkleTreeWitness, NetworkState } from "@proto-kit/protocol";

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
      afterNetworkState: new NetworkState(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        NetworkState.fromJSON(input.afterNetworkState as any)
      ),

      stateRoot: BigInt(input.stateRoot),
      blockHashRoot: BigInt(input.blockHashRoot),
      blockHashWitness: new BlockHashMerkleTreeWitness(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        BlockHashMerkleTreeWitness.fromJSON(input.blockHashWitness as any)
      ),
      afterBlockStateTransitions: this.stArrayMapper.mapIn(
        input.afterBlockStateTransitions
      ),
      blockHash: BigInt(input.blockHash),

      witnessedRoots: [BigInt(input.witnessedRoots[0])],
    };
  }

  public mapOut(input: BlockResult): DBBlockResult {
    return {
      stateRoot: input.stateRoot.toString(),
      blockHash: input.blockHash.toString(),
      blockHashRoot: input.blockHashRoot.toString(),

      blockHashWitness: BlockHashMerkleTreeWitness.toJSON(
        input.blockHashWitness
      ),
      afterBlockStateTransitions: this.stArrayMapper.mapOut(
        input.afterBlockStateTransitions
      ),
      afterNetworkState: NetworkState.toJSON(input.afterNetworkState),

      witnessedRoots: [input.witnessedRoots[0].toString()],
    };
  }
}
