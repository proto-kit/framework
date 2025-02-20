import { singleton } from "tsyringe";
import { BlockResult } from "@proto-kit/sequencer";
import {
  BlockResult as DBBlockResult,
  StateTransition as DBStateTransition,
  StateTransitionBatch as DBStateTransitionBatch,
} from "@prisma/client";
import { BlockHashMerkleTreeWitness, NetworkState } from "@proto-kit/protocol";

import { ObjectMapper } from "../../../ObjectMapper";

import { StateTransitionBatchArrayMapper } from "./StateTransitionMapper";

@singleton()
export class BlockResultMapper
  implements
    ObjectMapper<
      BlockResult,
      [
        DBBlockResult,
        [
          Omit<
            DBStateTransitionBatch,
            "txExecutionResultId" | "id" | "blockId" | "blockResultId"
          >,
          Omit<DBStateTransition, "batchId" | "id">[],
        ][],
      ]
    >
{
  public constructor(
    private readonly stArrayMapper: StateTransitionBatchArrayMapper
  ) {}

  public mapIn(
    input: [
      DBBlockResult,
      [
        Omit<
          DBStateTransitionBatch,
          "txExecutionResultId" | "id" | "blockId" | "blockResultId"
        >,
        Omit<DBStateTransition, "batchId" | "id">[],
      ][],
    ]
  ): BlockResult {
    const dbBlockResult = input[0];
    const stBatch = input[1];
    return {
      afterNetworkState: new NetworkState(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        NetworkState.fromJSON(dbBlockResult.afterNetworkState as any)
      ),

      stateRoot: BigInt(dbBlockResult.stateRoot),
      blockHashRoot: BigInt(dbBlockResult.blockHashRoot),
      blockHashWitness: new BlockHashMerkleTreeWitness(
        BlockHashMerkleTreeWitness.fromJSON(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          dbBlockResult.blockHashWitness as any
        )
      ),
      afterBlockStateTransitions:
        this.stArrayMapper.mapIn(stBatch)[0].stateTransitions,
      blockHash: BigInt(dbBlockResult.blockHash),

      witnessedRoots: [BigInt(dbBlockResult.witnessedRoots[0])],
    };
  }

  public mapOut(
    input: BlockResult
  ): [
    DBBlockResult,
    [
      Omit<
        DBStateTransitionBatch,
        "txExecutionResultId" | "id" | "blockId" | "blockResultId"
      >,
      Omit<DBStateTransition, "batchId" | "id">[],
    ][],
  ] {
    const dbBlockResult = {
      stateRoot: input.stateRoot.toString(),
      blockHash: input.blockHash.toString(),
      blockHashRoot: input.blockHashRoot.toString(),

      blockHashWitness: BlockHashMerkleTreeWitness.toJSON(
        input.blockHashWitness
      ),
      afterNetworkState: NetworkState.toJSON(input.afterNetworkState),

      witnessedRoots: [input.witnessedRoots[0].toString()],
    };
    const stBatches = this.stArrayMapper.mapOut([
      { stateTransitions: input.afterBlockStateTransitions, applied: true },
    ]);
    return [dbBlockResult, stBatches];
  }
}
