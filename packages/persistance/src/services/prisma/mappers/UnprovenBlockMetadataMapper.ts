import { singleton } from "tsyringe";
import { UnprovenBlockMetadata } from "@proto-kit/sequencer";
import { UnprovenBlockMetadata as DBUnprovenBlockMetadata } from "@prisma/client";
import { BlockHashMerkleTreeWitness, NetworkState } from "@proto-kit/protocol";

import { ObjectMapper } from "../../../ObjectMapper";

import { StateTransitionArrayMapper } from "./StateTransitionMapper";

@singleton()
export class UnprovenBlockMetadataMapper
  implements ObjectMapper<UnprovenBlockMetadata, DBUnprovenBlockMetadata>
{
  public constructor(
    private readonly stArrayMapper: StateTransitionArrayMapper
  ) {}

  public mapIn(input: DBUnprovenBlockMetadata): UnprovenBlockMetadata {
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
      blockStateTransitions: this.stArrayMapper.mapIn(
        input.blockStateTransitions
      ),
      blockHash: BigInt(input.blockHash),
    };
  }

  public mapOut(input: UnprovenBlockMetadata): DBUnprovenBlockMetadata {
    return {
      stateRoot: input.stateRoot.toString(),
      blockHash: input.blockHash.toString(),
      blockHashRoot: input.blockHashRoot.toString(),

      blockHashWitness: BlockHashMerkleTreeWitness.toJSON(
        input.blockHashWitness
      ),
      blockStateTransitions: this.stArrayMapper.mapOut(
        input.blockStateTransitions
      ),
      afterNetworkState: NetworkState.toJSON(input.afterNetworkState),
    };
  }
}
