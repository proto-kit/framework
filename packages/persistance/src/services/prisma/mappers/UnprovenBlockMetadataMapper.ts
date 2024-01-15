import { singleton } from "tsyringe";
import { UnprovenBlockMetadata } from "@proto-kit/sequencer";
import { UnprovenBlockMetadata as DBUnprovenBlockMetadata } from "@prisma/client";
import { BlockHashMerkleTreeWitness, NetworkState } from "@proto-kit/protocol";

import { ObjectMapper } from "../../../ObjectMapper";
import { StateTransitionArrayMapper } from "./StateTransitionMapper";

@singleton()
export class UnprovenBlockMetadataMapper
  implements
    ObjectMapper<
      UnprovenBlockMetadata,
      DBUnprovenBlockMetadata
    >
{
  public constructor(
    private readonly stArrayMapper: StateTransitionArrayMapper
  ) {}

  public mapIn(
    input: DBUnprovenBlockMetadata
  ): UnprovenBlockMetadata {
    return {
      afterNetworkState: new NetworkState(
        NetworkState.fromJSON(input.afterNetworkState as any)
      ),

      stateRoot: BigInt(input.stateRoot),
      blockHashRoot: BigInt(input.blockHashRoot),
      blockHashWitness: new BlockHashMerkleTreeWitness(
        BlockHashMerkleTreeWitness.fromJSON(input.blockHashWitness as any)
      ),
      blockStateTransitions: this.stArrayMapper.mapIn(
        input.blockStateTransitions
      ),
      blockTransactionsHash: BigInt(input.blockTransactionHash),
    };
  }

  public mapOut(
    input: UnprovenBlockMetadata
  ): DBUnprovenBlockMetadata {
    return {
      stateRoot: input.stateRoot.toString(),
      blockTransactionHash: input.blockTransactionsHash.toString(),
      blockHashRoot: input.blockHashRoot.toString(),

      blockHashWitness: BlockHashMerkleTreeWitness.toJSON(input.blockHashWitness),
      blockStateTransitions: this.stArrayMapper.mapOut(input.blockStateTransitions),
      afterNetworkState: NetworkState.toJSON(input.afterNetworkState),
    };
  }
}
