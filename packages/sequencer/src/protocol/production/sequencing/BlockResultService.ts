import { Bool, Field, Poseidon } from "o1js";
import { LinkedMerkleTree } from "@proto-kit/common";
import {
  AfterBlockHookArguments,
  BlockHashMerkleTree,
  BlockHashTreeEntry,
  MandatoryProtocolModulesRecord,
  NetworkState,
  Protocol,
  ProtocolModulesRecord,
  ProvableBlockHook,
  RuntimeTransaction,
  StateServiceProvider,
} from "@proto-kit/protocol";
import { inject, injectable, Lifecycle, scoped } from "tsyringe";

import {
  Block,
  BlockResult,
  TransactionExecutionResult,
} from "../../../storage/model/Block";
import { AsyncMerkleTreeStore } from "../../../state/async/AsyncMerkleTreeStore";
import { CachedMerkleTreeStore } from "../../../state/merkle/CachedMerkleTreeStore";
import { UntypedStateTransition } from "../helpers/UntypedStateTransition";
import { CachedStateService } from "../../../state/state/CachedStateService";
import { AsyncStateService } from "../../../state/async/AsyncStateService";
import type { StateRecord } from "../BatchProducerModule";
import { trace } from "../../../logging/trace";
import { Tracer } from "../../../logging/Tracer";
import { AsyncLinkedLeafStore } from "../../../state/async/AsyncLinkedLeafStore";
import { CachedLinkedLeafStore } from "../../../state/lmt/CachedLinkedLeafStore";

import { executeWithExecutionContext } from "./TransactionExecutionService";

// This is ordered, because javascript maintains the order based on time of first insertion
function collectOrderedStateDiff(
  stateTransitions: UntypedStateTransition[]
): StateRecord {
  return stateTransitions.reduce<Record<string, Field[] | undefined>>(
    (state, st) => {
      if (st.toValue.isSome.toBoolean()) {
        state[st.path.toString()] = st.toValue.value;
      }
      return state;
    },
    {}
  );
}

function createCombinedOrderedStateDiff(
  transactions: TransactionExecutionResult[],
  blockHookSTs: UntypedStateTransition[]
) {
  // Flatten diff list into a single diff by applying them over each other
  return transactions
    .map((tx) => {
      const transitions = tx.stateTransitions
        .filter(({ applied }) => applied)
        .flatMap(({ stateTransitions }) => stateTransitions);

      transitions.push(...blockHookSTs);

      return collectOrderedStateDiff(transitions);
    })
    .reduce<StateRecord>((accumulator, diff) => {
      // accumulator properties will be overwritten by diff's values
      return Object.assign(accumulator, diff);
    }, {});
}

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class BlockResultService {
  private readonly blockHooks: ProvableBlockHook<unknown>[];

  public constructor(
    @inject("Protocol")
    protocol: Protocol<MandatoryProtocolModulesRecord & ProtocolModulesRecord>,
    @inject("StateServiceProvider")
    private readonly stateServiceProvider: StateServiceProvider,
    @inject("Tracer")
    public readonly tracer: Tracer
  ) {
    this.blockHooks =
      protocol.dependencyContainer.resolveAll("ProvableBlockHook");
  }

  @trace("block.hook.after")
  public async executeAfterBlockHook(
    args: AfterBlockHookArguments,
    inputNetworkState: NetworkState,
    asyncStateService: AsyncStateService
  ) {
    const cachedStateService = new CachedStateService(asyncStateService);
    this.stateServiceProvider.setCurrentStateService(cachedStateService);

    // Execute afterBlock hooks
    const context = {
      networkState: inputNetworkState,
      transaction: RuntimeTransaction.dummyTransaction(),
    };

    const executionResult = await executeWithExecutionContext(
      async () =>
        await this.blockHooks.reduce<Promise<NetworkState>>(
          async (networkState, hook) =>
            await hook.afterBlock(await networkState, args),
          Promise.resolve(inputNetworkState)
        ),
      context
    );

    this.stateServiceProvider.popCurrentStateService();
    await cachedStateService.applyStateTransitions(
      executionResult.stateTransitions
    );

    return {
      executionResult,
      cachedStateService,
    };
  }

  /** Update the block hash tree with this block */
  private async insertIntoBlockHashTree(
    block: Block,
    blockHashTreeStore: AsyncMerkleTreeStore
  ) {
    const blockHashInMemoryStore = new CachedMerkleTreeStore(
      blockHashTreeStore
    );

    // TODO This can be optimized a lot (we are only interested in the root at this step)
    await blockHashInMemoryStore.preloadKey(block.height.toBigInt());

    const blockHashTree = new BlockHashMerkleTree(blockHashInMemoryStore);

    blockHashTree.setLeaf(
      block.height.toBigInt(),
      new BlockHashTreeEntry({
        block: {
          index: block.height,
          transactionListHash: block.transactionsHash,
        },
        closed: Bool(true),
      }).hash()
    );
    const blockHashWitness = blockHashTree.getWitness(block.height.toBigInt());
    const newBlockHashRoot = blockHashTree.getRoot();

    return {
      blockHashWitness,
      blockHashRoot: newBlockHashRoot,
      cachedBlockHashTreeStore: blockHashInMemoryStore,
    };
  }

  public async applyStateDiff(
    store: CachedLinkedLeafStore,
    stateDiff: StateRecord
  ): Promise<LinkedMerkleTree> {
    await store.preloadKeys(Object.keys(stateDiff).map(BigInt));

    // In case the diff is empty, we preload key 0 in order to
    // retrieve the root, which we need later
    if (Object.keys(stateDiff).length === 0) {
      await store.preloadKey(0n);
    }

    const tree = new LinkedMerkleTree(store.treeStore, store);

    Object.entries(stateDiff).forEach(([key, state]) => {
      const treeValue = state !== undefined ? Poseidon.hash(state) : Field(0);
      tree.setLeaf(BigInt(key), treeValue.toBigInt());
    });

    return tree;
  }

  @trace("block.result.generate", ([block]) => ({
    height: block.height.toString(),
  }))
  public async generateMetadataForNextBlock(
    block: Block,
    merkleTreeStore: AsyncLinkedLeafStore,
    blockHashTreeStore: AsyncMerkleTreeStore,
    stateService: AsyncStateService
  ): Promise<{
    result: BlockResult;
    treeStore: CachedLinkedLeafStore;
    blockHashTreeStore: CachedMerkleTreeStore;
    stateService: CachedStateService;
  }> {
    const combinedDiff = createCombinedOrderedStateDiff(
      block.transactions,
      block.beforeBlockStateTransitions
    );

    const inMemoryStore = await CachedLinkedLeafStore.new(merkleTreeStore);

    const tree = await this.applyStateDiff(inMemoryStore, combinedDiff);

    const witnessedStateRoot = tree.getRoot();

    const { blockHashWitness, blockHashRoot, cachedBlockHashTreeStore } =
      await this.insertIntoBlockHashTree(block, blockHashTreeStore);

    const {
      executionResult: { stateTransitions, methodResult },
      cachedStateService,
    } = await this.executeAfterBlockHook(
      {
        blockHashRoot,
        stateRoot: witnessedStateRoot,
        incomingMessagesHash: block.toMessagesHash,
        transactionsHash: block.transactionsHash,
        eternalTransactionsHash: block.toEternalTransactionsHash,
      },
      block.networkState.during,
      stateService
    );

    // Apply afterBlock STs to the tree
    const tree2 = await this.applyStateDiff(
      inMemoryStore,
      collectOrderedStateDiff(
        stateTransitions.map((stateTransition) =>
          UntypedStateTransition.fromStateTransition(stateTransition)
        )
      )
    );

    const stateRoot = tree2.getRoot();

    return {
      result: {
        afterNetworkState: methodResult,
        // This is the state root after the last tx and the afterBlock hook
        stateRoot: stateRoot.toBigInt(),
        witnessedRoots: [witnessedStateRoot.toBigInt()],
        blockHashRoot: blockHashRoot.toBigInt(),
        blockHashWitness,

        afterBlockStateTransitions: stateTransitions.map((st) =>
          UntypedStateTransition.fromStateTransition(st)
        ),
        blockHash: block.hash.toBigInt(),
      },
      treeStore: inMemoryStore,
      blockHashTreeStore: cachedBlockHashTreeStore,
      stateService: cachedStateService,
    };
  }
}
