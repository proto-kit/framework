import { Bool, Field } from "o1js";
import { mapSequential, RollupMerkleTree } from "@proto-kit/common";
import { injectable } from "tsyringe";
import {
  AppliedBatchHashList,
  AppliedStateTransitionBatchState,
  DefaultProvableHashList,
  ProvableStateTransition,
  StateTransitionProvableBatch,
  StateTransitionProverPublicInput,
  StateTransitionType,
  WitnessedRoot,
} from "@proto-kit/protocol";

import { distinctByString } from "../../../helpers/utils";
import { BlockWithResult } from "../../../storage/model/Block";
import { UntypedStateTransition } from "../helpers/UntypedStateTransition";
import { CachedMerkleTreeStore } from "../../../state/merkle/CachedMerkleTreeStore";
import { StateTransitionProofParameters } from "../tasks/StateTransitionTask";
import { SyncCachedMerkleTreeStore } from "../../../state/merkle/SyncCachedMerkleTreeStore";

export interface TracingStateTransitionBatch {
  stateTransitions: UntypedStateTransition[];
  applied: boolean;
  witnessRoot: boolean;
}

@injectable()
export class StateTransitionTracingService {
  private allKeys(stateTransitions: { path: Field }[]): Field[] {
    // We have to do the distinct with strings because
    // array.indexOf() doesn't work with fields
    return stateTransitions.map((st) => st.path).filter(distinctByString);
  }

  public extractSTBatches(
    blocks: BlockWithResult[]
  ): TracingStateTransitionBatch[] {
    return blocks.reduce<TracingStateTransitionBatch[]>((previous, block) => {
      const batches = [
        {
          stateTransitions: block.block.beforeBlockStateTransitions,
          applied: true,
        },
        ...block.block.transactions.flatMap((tx) => tx.stateTransitions),
      ].map((batch) => ({ ...batch, witnessRoot: false }));

      const batchBeforeWitnessing = previous.concat(batches);

      // If no STs were emitted in the current block, we fall back to the previous block
      // If there are no batches, we don't push a witness attestation
      if (batchBeforeWitnessing.length > 0) {
        batchBeforeWitnessing.at(-1)!.witnessRoot = true;
      }

      return batchBeforeWitnessing.concat({
        stateTransitions: block.result.afterBlockStateTransitions,
        applied: true,
        witnessRoot: false,
      });
    }, []);
  }

  public async createMerkleTrace(
    merkleStore: CachedMerkleTreeStore,
    stateTransitions: TracingStateTransitionBatch[]
  ) {
    const batches = StateTransitionProvableBatch.fromBatches(
      stateTransitions.map(
        ({
          stateTransitions: batchStateTransitions,
          applied,
          witnessRoot,
        }) => ({
          stateTransitions: batchStateTransitions.map((transition) =>
            transition.toProvable()
          ),
          applied: Bool(applied),
          witnessRoot: Bool(witnessRoot),
        })
      )
    );

    return await this.traceTransitions(merkleStore, batches);
  }

  public async traceTransitions(
    merkleStore: CachedMerkleTreeStore,
    batches: StateTransitionProvableBatch[]
  ): Promise<StateTransitionProofParameters[]> {
    const keys = this.allKeys(
      batches.flatMap((batch) =>
        batch.batch.map((transition) => transition.stateTransition)
      )
    );

    await merkleStore.preloadKeys(keys.map((key) => key.toBigInt()));

    let batchMerkleStore = new SyncCachedMerkleTreeStore(merkleStore);

    let tree = new RollupMerkleTree(batchMerkleStore);
    const initialRoot = tree.getRoot();

    const batchList = new AppliedBatchHashList(Field(0));
    let currentSTList = new DefaultProvableHashList(ProvableStateTransition);
    const rootAccumulator = new DefaultProvableHashList<WitnessedRoot>(
      WitnessedRoot
    );

    let finalizedStateRoot = initialRoot;
    let danglingStateRoot = initialRoot;

    return await mapSequential<
      StateTransitionProvableBatch,
      StateTransitionProofParameters
    >(batches, async (batch) => {
      const batchState = new AppliedStateTransitionBatchState({
        batchHash: currentSTList.commitment,
        root: danglingStateRoot,
      });
      const publicInput: StateTransitionProverPublicInput = {
        batchesHash: batchList.commitment,
        currentBatchStateHash: batchState.hashOrZero(),
        root: finalizedStateRoot,
        rootAccumulator: rootAccumulator.commitment,
      };

      const witnesses = await mapSequential(
        batch.batch,
        async (transitionInfo) => {
          const { stateTransition, type, witnessRoot } = transitionInfo;

          const merkleWitness = tree.getWitness(
            stateTransition.path.toBigInt()
          );

          if (stateTransition.to.isSome.toBoolean()) {
            tree.setLeaf(
              stateTransition.path.toBigInt(),
              stateTransition.to.value
            );

            danglingStateRoot = tree.getRoot();
          }

          currentSTList.push(stateTransition);

          if (type.isClosing().toBoolean()) {
            let apply;

            if (
              type.type.equals(StateTransitionType.closeAndApply).toBoolean()
            ) {
              apply = true;

              finalizedStateRoot = danglingStateRoot;

              // We can reuse the batchMerkleStore here, since mergeIntoParent()
              // resets the only state that the store has, therefore its equivalent
              // to creating a new one
              batchMerkleStore.mergeIntoParent();
            } else if (
              type.type
                .equals(StateTransitionType.closeAndThrowAway)
                .toBoolean()
            ) {
              apply = false;

              danglingStateRoot = finalizedStateRoot;

              batchMerkleStore = new SyncCachedMerkleTreeStore(merkleStore);
              tree = new RollupMerkleTree(batchMerkleStore);
            } else {
              throw new Error("Unreachable");
            }

            batchList.push({
              batchHash: currentSTList.commitment,
              applied: Bool(apply),
            });

            if (witnessRoot.toBoolean()) {
              rootAccumulator.push({
                root: finalizedStateRoot,
                appliedBatchListState: batchList.commitment,
              });
            }

            currentSTList =
              new DefaultProvableHashList<ProvableStateTransition>(
                ProvableStateTransition
              );
          }

          return [merkleWitness, witnessRoot] as const;
        }
      );

      return {
        batch,
        merkleWitnesses: witnesses.map(([merkleWitness]) => merkleWitness),
        publicInput,
        batchState,
        witnessRoots: {
          values: witnesses.map(([, witnessRoot]) => witnessRoot),
        },
      };
    });
  }
}
