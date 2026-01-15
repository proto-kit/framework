import { Bool, Field } from "o1js";
import {
  LinkedMerkleTree,
  LinkedMerkleTreeWitness,
  mapSequential,
} from "@proto-kit/common";
import { inject, injectable } from "tsyringe";
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
import {
  UntypedStateTransition,
  UntypedStateTransitionJson,
} from "../helpers/UntypedStateTransition";
import { StateTransitionProofParameters } from "../tasks/StateTransitionTask";
import { trace } from "../../../logging/trace";
import { Tracer } from "../../../logging/Tracer";
import { CachedLinkedLeafStore } from "../../../state/lmt/CachedLinkedLeafStore";
import { SyncCachedLinkedLeafStore } from "../../../state/merkle/SyncCachedLinkedLeafStore";

export interface TracingStateTransitionBatch {
  stateTransitions: UntypedStateTransition[];
  applied: boolean;
  witnessRoot: boolean;
}

@injectable()
export class StateTransitionTracingService {
  public constructor(@inject("Tracer") public readonly tracer: Tracer) {}

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
          stateTransitions: block.block.beforeBlockStateTransitions.map(
            (st: UntypedStateTransitionJson) =>
              UntypedStateTransition.fromJSON(st)
          ),
          applied: true,
        },
        ...block.block.transactions.flatMap((tx) =>
          tx.stateTransitions.map((batch) => ({
            stateTransitions: batch.stateTransitions.map((st) =>
              UntypedStateTransition.fromJSON(st)
            ),
            applied: batch.applied,
          }))
        ),
      ].map((batch) => ({ ...batch, witnessRoot: false }));

      const batchBeforeWitnessing = previous.concat(batches);

      // If no STs were emitted in the current block, we fall back to the previous block
      // If there are no batches, we don't push a witness attestation
      if (batchBeforeWitnessing.length > 0) {
        batchBeforeWitnessing.at(-1)!.witnessRoot = true;
      }

      return batchBeforeWitnessing.concat({
        stateTransitions: block.result.afterBlockStateTransitions.map(
          (st: UntypedStateTransitionJson) =>
            UntypedStateTransition.fromJSON(st)
        ),
        applied: true,
        witnessRoot: false,
      });
    }, []);
  }

  @trace("batch.trace.transitions.merkle_trace")
  public async createMerkleTrace(
    merkleStore: CachedLinkedLeafStore,
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
    merkleStore: CachedLinkedLeafStore,
    batches: StateTransitionProvableBatch[]
  ): Promise<StateTransitionProofParameters[]> {
    const keys = this.allKeys(
      batches.flatMap((batch) =>
        batch.batch.map((transition) => transition.stateTransition)
      )
    );

    await merkleStore.preloadKeys(keys.map((key) => key.toBigInt()));

    let batchMerkleStore = new SyncCachedLinkedLeafStore(merkleStore);

    let tree = new LinkedMerkleTree(
      batchMerkleStore.treeStore,
      batchMerkleStore
    );
    const initialRoot = tree.getRoot();

    const batchList = new AppliedBatchHashList(Field(0));
    let currentSTList = new DefaultProvableHashList(ProvableStateTransition);
    const witnessedRootsList = new DefaultProvableHashList<WitnessedRoot>(
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
        witnessedRootsHash: witnessedRootsList.commitment,
      };

      const witnesses = await mapSequential(
        batch.batch,
        async (transitionInfo) => {
          const { stateTransition, type, witnessRoot } = transitionInfo;

          let witness: LinkedMerkleTreeWitness;

          if (stateTransition.to.isSome.toBoolean()) {
            witness = tree.setLeaf(
              stateTransition.path.toBigInt(),
              stateTransition.to.value.toBigInt()
            );

            danglingStateRoot = tree.getRoot();
          } else {
            witness = LinkedMerkleTreeWitness.fromReadWitness(
              tree.getReadWitness(stateTransition.path.toBigInt())
            );
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

              batchMerkleStore = new SyncCachedLinkedLeafStore(merkleStore);
              tree = new LinkedMerkleTree(
                batchMerkleStore.treeStore,
                batchMerkleStore
              );
            } else {
              throw new Error("Unreachable");
            }

            batchList.push({
              batchHash: currentSTList.commitment,
              applied: Bool(apply),
            });

            if (witnessRoot.toBoolean()) {
              witnessedRootsList.push({
                root: finalizedStateRoot,
                appliedBatchListState: batchList.commitment,
              });
            }

            currentSTList =
              new DefaultProvableHashList<ProvableStateTransition>(
                ProvableStateTransition
              );
          }

          return [witness, witnessRoot] as const;
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
