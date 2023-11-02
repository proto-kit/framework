/* eslint-disable max-lines,@typescript-eslint/init-declarations */
import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import {
  MethodParameterDecoder,
  Runtime,
  RuntimeModule,
  MethodIdResolver,
} from "@proto-kit/module";
import {
  RuntimeMethodExecutionContext,
  RuntimeProvableMethodExecutionResult,
  BlockProverExecutionData,
  DefaultProvableHashList,
  NetworkState,
  Protocol,
  ProtocolConstants,
  ProvableHashList,
  ProvableStateTransition,
  ProvableStateTransitionType,
  ProvableTransactionHook,
  RollupMerkleTree,
  RuntimeTransaction,
  StateService,
  StateTransition,
  StateTransitionType,
  RuntimeMethodExecutionData,
} from "@proto-kit/protocol";
import { Bool, Field } from "o1js";
import chunk from "lodash/chunk";

import { PendingTransaction } from "../../mempool/PendingTransaction";
import { distinctByString } from "../../helpers/utils";
import { ComputedBlockTransaction } from "../../storage/model/Block";

import type { StateRecord, TransactionTrace } from "./BlockProducerModule";
import { StateTransitionProofParameters } from "./tasks/StateTransitionTaskParameters";
import { DummyStateService } from "../../state/state/DummyStateService";
import { CachedMerkleTreeStore } from "../../state/merkle/CachedMerkleTreeStore";
import { CachedStateService } from "../../state/state/CachedStateService";
import { SyncCachedMerkleTreeStore } from "../../state/merkle/SyncCachedMerkleTreeStore";
import { TransactionExecutionResult } from "./unproven/TransactionExecutionService";

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class TransactionTraceService {
  public constructor(
    @inject("Runtime") private readonly runtime: Runtime<never>,
    @inject("Protocol") private readonly protocol: Protocol<never>
  ) {}

  private allKeys(stateTransitions: StateTransition<unknown>[]): Field[] {
    // We have to do the distinct with strings because
    // array.indexOf() doesn't work with fields
    return stateTransitions.map((st) => st.path).filter(distinctByString);
  }

  private async collectStartingState(
    stateService: CachedStateService,
    stateTransitions: StateTransition<unknown>[]
  ): Promise<Record<string, Field[] | undefined>> {
    const keys = this.allKeys(stateTransitions);
    await stateService.preloadKeys(keys);

    return keys.reduce<Record<string, Field[] | undefined>>((state, key) => {
      state[key.toString()] = stateService.get(key);
      return state;
    }, {});
  }

  private applyTransitions(
    stateService: CachedStateService,
    stateTransitions: StateTransition<unknown>[]
  ): void {
    // Use updated stateTransitions since only they will have the
    // right values
    stateTransitions
      .filter((st) => st.to.isSome.toBoolean())
      .forEach((st) => {
        stateService.set(st.path, st.to.toFields());
      });
  }

  /**
   * What is in a trace?
   * A trace has two parts:
   * 1. start values of storage keys accessed by all state transitions
   * 2. Merkle Witnesses of the keys accessed by the state transitions
   *
   * How do we create a trace?
   *
   * 1. We execute the transaction and create the stateTransitions
   * The first execution is done with a DummyStateService to find out the
   * accessed keys that can then be cached for the actual run, which generates
   * the correct state transitions and  has to be done for the next
   * transactions to be based on the correct state.
   *
   * 2. We extract the accessed keys, download the state and put it into
   * AppChainProveParams
   *
   * 3. We retrieve merkle witnesses for each step and put them into
   * StateTransitionProveParams
   */
  public async createTrace(
    executionResult: TransactionExecutionResult,
    stateServices: {
      stateService: CachedStateService;
      merkleStore: CachedMerkleTreeStore;
    },
    networkState: NetworkState,
    bundleTracker: ProvableHashList<Field>
  ): Promise<TransactionTrace> {
    const { stateTransitions, protocolTransitions, status, tx } =
      executionResult;

    // Collect starting state
    const protocolStartingState = await this.collectStartingState(
      stateServices.stateService,
      protocolTransitions
    );

    this.applyTransitions(stateServices.stateService, protocolTransitions);

    const runtimeStartingState = await this.collectStartingState(
      stateServices.stateService,
      stateTransitions
    );

    this.applyTransitions(stateServices.stateService, stateTransitions);

    // Step 3
    const { stParameters, fromStateRoot } = await this.createMerkleTrace(
      stateServices.merkleStore,
      stateTransitions,
      protocolTransitions,
      status.toBoolean()
    );

    const transactionsHash = bundleTracker.commitment;
    bundleTracker.push(tx.hash());

    return {
      runtimeProver: {
        tx,
        state: runtimeStartingState,
        networkState,
      },

      stateTransitionProver: stParameters,

      blockProver: {
        publicInput: {
          stateRoot: fromStateRoot,
          transactionsHash,
          networkStateHash: networkState.hash(),
        },

        executionData: {
          networkState,
          transaction: tx.toProtocolTransaction(),
        },

        startingState: protocolStartingState,
      },
    };
  }

  private async createMerkleTrace(
    merkleStore: CachedMerkleTreeStore,
    stateTransitions: StateTransition<unknown>[],
    protocolTransitions: StateTransition<unknown>[],
    runtimeSuccess: boolean
  ): Promise<{
    stParameters: StateTransitionProofParameters[];
    fromStateRoot: Field;
  }> {
    const keys = this.allKeys(protocolTransitions.concat(stateTransitions));

    const runtimeSimulationMerkleStore = new SyncCachedMerkleTreeStore(
      merkleStore
    );

    await Promise.all(
      keys.map(async (key) => {
        await merkleStore.preloadKey(key.toBigInt());
      })
    );

    const tree = new RollupMerkleTree(merkleStore);
    const runtimeTree = new RollupMerkleTree(runtimeSimulationMerkleStore);
    // const runtimeTree = new RollupMerkleTree(merkleStore);
    const initialRoot = tree.getRoot();

    const transitionsList = new DefaultProvableHashList(
      ProvableStateTransition
    );
    const protocolTransitionsList = new DefaultProvableHashList(
      ProvableStateTransition
    );

    const allTransitions = protocolTransitions
      .map<[StateTransition<unknown>, boolean]>((protocolTransition) => [
        protocolTransition,
        StateTransitionType.protocol,
      ])
      .concat(
        stateTransitions.map((transition) => [
          transition,
          StateTransitionType.normal,
        ])
      );

    let stateRoot = initialRoot;
    let protocolStateRoot = initialRoot;

    const stParameters = chunk(
      allTransitions,
      ProtocolConstants.stateTransitionProverBatchSize
    ).map<StateTransitionProofParameters>((currentChunk, index) => {
      const fromStateRoot = stateRoot;
      const fromProtocolStateRoot = protocolStateRoot;

      const stateTransitionsHash = transitionsList.commitment;
      const protocolTransitionsHash = protocolTransitionsList.commitment;

      // Map all STs to traces for current chunk
      const merkleWitnesses = currentChunk.map(([transition, type]) => {
        // Select respective tree (whether type is protocol
        // (which will be applied no matter what)
        // or runtime (which might be thrown away)
        const usedTree = StateTransitionType.isProtocol(type)
          ? tree
          : runtimeTree;

        const provableTransition = transition.toProvable();

        const witness = usedTree.getWitness(provableTransition.path.toBigInt());

        if (provableTransition.to.isSome.toBoolean()) {
          usedTree.setLeaf(
            provableTransition.path.toBigInt(),
            provableTransition.to.value
          );

          stateRoot = usedTree.getRoot();
          if (StateTransitionType.isProtocol(type)) {
            protocolStateRoot = stateRoot;
          }
        }

        // Push transition to respective hashlist
        (StateTransitionType.isNormal(type)
          ? transitionsList
          : protocolTransitionsList
        ).pushIf(
          provableTransition,
          provableTransition.path.equals(Field(0)).not()
        );

        return witness;
      });

      return {
        merkleWitnesses,

        // eslint-disable-next-line putout/putout
        stateTransitions: currentChunk.map(([st, type]) => {
          return {
            transition: st.toProvable(),
            type: new ProvableStateTransitionType({ type: Bool(type) }),
          };
        }),

        publicInput: {
          stateRoot: fromStateRoot,
          protocolStateRoot: fromProtocolStateRoot,
          stateTransitionsHash,
          protocolTransitionsHash,
        },
      };
    });

    // If runtime succeeded, merge runtime changes into parent,
    // otherwise throw them away
    if (runtimeSuccess) {
      runtimeSimulationMerkleStore.mergeIntoParent();
    }

    return {
      stParameters,
      fromStateRoot: initialRoot,
    };
  }
}
