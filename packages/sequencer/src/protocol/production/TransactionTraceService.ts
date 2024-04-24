import { injectable, Lifecycle, scoped } from "tsyringe";
import {
  BlockProverPublicInput,
  DefaultProvableHashList,
  NetworkState,
  ProtocolConstants,
  ProvableHashList,
  ProvableStateTransition,
  ProvableStateTransitionType,
  StateTransitionProverPublicInput,
  StateTransitionType,
} from "@proto-kit/protocol";
import { RollupMerkleTree } from "@proto-kit/common";
import { Bool, Field } from "o1js";
import chunk from "lodash/chunk";

import { distinctByString } from "../../helpers/utils";
import { CachedMerkleTreeStore } from "../../state/merkle/CachedMerkleTreeStore";
import { CachedStateService } from "../../state/state/CachedStateService";
import { SyncCachedMerkleTreeStore } from "../../state/merkle/SyncCachedMerkleTreeStore";
import type {
  TransactionExecutionResult,
  UnprovenBlockWithMetadata,
} from "../../storage/model/UnprovenBlock";
import { AsyncMerkleTreeStore } from "../../state/async/AsyncMerkleTreeStore";

import type { TransactionTrace, BlockTrace } from "./BlockProducerModule";
import { StateTransitionProofParameters } from "./tasks/StateTransitionTaskParameters";
import { UntypedStateTransition } from "./helpers/UntypedStateTransition";

export type TaskStateRecord = Record<string, Field[]>;

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class TransactionTraceService {
  private allKeys(stateTransitions: UntypedStateTransition[]): Field[] {
    // We have to do the distinct with strings because
    // array.indexOf() doesn't work with fields
    return stateTransitions.map((st) => st.path).filter(distinctByString);
  }

  private async collectStartingState(
    stateService: CachedStateService,
    stateTransitions: UntypedStateTransition[]
  ): Promise<TaskStateRecord> {
    const keys = this.allKeys(stateTransitions);
    await stateService.preloadKeys(keys);

    return keys.reduce<TaskStateRecord>((state, key) => {
      const stateValue = stateService.get(key);
      if (stateValue !== undefined) {
        state[key.toString()] = stateValue;
      }
      return state;
    }, {});
  }

  private applyTransitions(
    stateService: CachedStateService,
    stateTransitions: UntypedStateTransition[]
  ): void {
    // Use updated stateTransitions since only they will have the
    // right values
    stateTransitions
      .filter((st) => st.toValue.isSome.toBoolean())
      .forEach((st) => {
        stateService.set(st.path, st.toValue.toFields());
      });
  }

  public async createBlockTrace(
    traces: TransactionTrace[],
    stateServices: {
      stateService: CachedStateService;
      merkleStore: CachedMerkleTreeStore;
    },
    blockHashTreeStore: AsyncMerkleTreeStore,
    beforeBlockStateRoot: Field,
    block: UnprovenBlockWithMetadata
  ): Promise<BlockTrace> {
    const stateTransitions = block.metadata.blockStateTransitions;

    const startingState = await this.collectStartingState(
      stateServices.stateService,
      stateTransitions
    );

    let stParameters: StateTransitionProofParameters[];
    let fromStateRoot: Field;

    if (stateTransitions.length > 0) {
      this.applyTransitions(stateServices.stateService, stateTransitions);

      ({ stParameters, fromStateRoot } = await this.createMerkleTrace(
        stateServices.merkleStore,
        stateTransitions,
        [],
        true
      ));
    } else {
      await stateServices.merkleStore.preloadKey(0n);

      fromStateRoot = Field(
        stateServices.merkleStore.getNode(0n, RollupMerkleTree.HEIGHT - 1) ??
          RollupMerkleTree.EMPTY_ROOT
      );

      stParameters = [
        {
          stateTransitions: [],
          merkleWitnesses: [],

          publicInput: new StateTransitionProverPublicInput({
            stateRoot: fromStateRoot,
            protocolStateRoot: fromStateRoot,
            stateTransitionsHash: Field(0),
            protocolTransitionsHash: Field(0),
          }),
        },
      ];
    }

    const fromNetworkState = block.block.networkState.before;

    const publicInput = new BlockProverPublicInput({
      transactionsHash: Field(0),
      networkStateHash: fromNetworkState.hash(),
      stateRoot: beforeBlockStateRoot,
      blockHashRoot: block.block.fromBlockHashRoot,
      eternalTransactionsHash: block.block.fromEternalTransactionsHash,
      incomingMessagesHash: block.block.fromMessagesHash,
    });

    return {
      transactions: traces,
      stateTransitionProver: stParameters,

      block: {
        networkState: fromNetworkState,
        publicInput,
        blockWitness: block.metadata.blockHashWitness,
        startingState,
      },
    };
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
  public async createTransactionTrace(
    executionResult: TransactionExecutionResult,
    stateServices: {
      stateService: CachedStateService;
      merkleStore: CachedMerkleTreeStore;
    },
    networkState: NetworkState,
    bundleTracker: ProvableHashList<Field>,
    eternalBundleTracker: ProvableHashList<Field>,
    messageTracker: ProvableHashList<Field>
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

    if (status.toBoolean()) {
      this.applyTransitions(stateServices.stateService, stateTransitions);
    }

    // Step 3
    const { stParameters, fromStateRoot } = await this.createMerkleTrace(
      stateServices.merkleStore,
      stateTransitions,
      protocolTransitions,
      status.toBoolean()
    );

    const transactionsHash = bundleTracker.commitment;
    const eternalTransactionsHash = eternalBundleTracker.commitment;
    const incomingMessagesHash = messageTracker.commitment;

    if (tx.isMessage) {
      messageTracker.push(tx.hash());
    } else {
      bundleTracker.push(tx.hash());
      eternalBundleTracker.push(tx.hash());
    }

    const signedTransaction = tx.toProtocolTransaction();

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
          eternalTransactionsHash,
          incomingMessagesHash,
          networkStateHash: networkState.hash(),
          blockHashRoot: Field(0),
        },

        executionData: {
          networkState,
          transaction: signedTransaction.transaction,
          signature: signedTransaction.signature,
        },

        startingState: protocolStartingState,
      },
    };
  }

  private async createMerkleTrace(
    merkleStore: CachedMerkleTreeStore,
    stateTransitions: UntypedStateTransition[],
    protocolTransitions: UntypedStateTransition[],
    runtimeSuccess: boolean
  ): Promise<{
    stParameters: StateTransitionProofParameters[];
    fromStateRoot: Field;
  }> {
    const keys = this.allKeys(protocolTransitions.concat(stateTransitions));

    const runtimeSimulationMerkleStore = new SyncCachedMerkleTreeStore(
      merkleStore
    );

    await merkleStore.preloadKeys(keys.map((key) => key.toBigInt()));

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
      .map<
        [UntypedStateTransition, boolean]
      >((protocolTransition) => [protocolTransition, StateTransitionType.protocol])
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
