import { Bool, Field, Poseidon } from "o1js";
import { RollupMerkleTree } from "@proto-kit/common";
import {
  BlockHashMerkleTree,
  BlockHashTreeEntry,
  BlockProverState,
  MandatoryProtocolModulesRecord,
  NetworkState,
  Protocol,
  ProtocolModulesRecord,
  ProvableBlockHook,
  RuntimeTransaction,
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
import type { StateRecord } from "../BatchProducerModule";

import { executeWithExecutionContext } from "./TransactionExecutionService";

function collectStateDiff(
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

function createCombinedStateDiff(transactions: TransactionExecutionResult[]) {
  // Flatten diff list into a single diff by applying them over each other
  return transactions
    .map((tx) => {
      const transitions = tx.protocolTransitions.concat(
        tx.status.toBoolean() ? tx.stateTransitions : []
      );
      return collectStateDiff(transitions);
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
    protocol: Protocol<MandatoryProtocolModulesRecord & ProtocolModulesRecord>
  ) {
    this.blockHooks =
      protocol.dependencyContainer.resolveAll("ProvableBlockHook");
  }

  public async generateMetadataForNextBlock(
    block: Block,
    merkleTreeStore: AsyncMerkleTreeStore,
    blockHashTreeStore: AsyncMerkleTreeStore,
    modifyTreeStore = true
  ): Promise<BlockResult> {
    const combinedDiff = createCombinedStateDiff(block.transactions);

    const inMemoryStore = new CachedMerkleTreeStore(merkleTreeStore);
    const tree = new RollupMerkleTree(inMemoryStore);
    const blockHashInMemoryStore = new CachedMerkleTreeStore(
      blockHashTreeStore
    );
    const blockHashTree = new BlockHashMerkleTree(blockHashInMemoryStore);

    await inMemoryStore.preloadKeys(Object.keys(combinedDiff).map(BigInt));

    // In case the diff is empty, we preload key 0 in order to
    // retrieve the root, which we need later
    if (Object.keys(combinedDiff).length === 0) {
      await inMemoryStore.preloadKey(0n);
    }

    // TODO This can be optimized a lot (we are only interested in the root at this step)
    await blockHashInMemoryStore.preloadKey(block.height.toBigInt());

    Object.entries(combinedDiff).forEach(([key, state]) => {
      const treeValue = state !== undefined ? Poseidon.hash(state) : Field(0);
      tree.setLeaf(BigInt(key), treeValue);
    });

    const stateRoot = tree.getRoot();
    const fromBlockHashRoot = blockHashTree.getRoot();

    const state: BlockProverState = {
      stateRoot,
      transactionsHash: block.transactionsHash,
      networkStateHash: block.networkState.during.hash(),
      eternalTransactionsHash: block.toEternalTransactionsHash,
      blockHashRoot: fromBlockHashRoot,
      incomingMessagesHash: block.toMessagesHash,
    };

    // TODO Set StateProvider for @state access to state
    const context = {
      networkState: block.networkState.during,
      transaction: RuntimeTransaction.dummyTransaction(),
    };

    const executionResult = await executeWithExecutionContext(
      async () =>
        await this.blockHooks.reduce<Promise<NetworkState>>(
          async (networkState, hook) =>
            await hook.afterBlock(await networkState, state),
          Promise.resolve(block.networkState.during)
        ),
      context
    );

    const { stateTransitions, methodResult } = executionResult;

    // Update the block hash tree with this block
    blockHashTree.setLeaf(
      block.height.toBigInt(),
      new BlockHashTreeEntry({
        blockHash: Poseidon.hash([block.height, state.transactionsHash]),
        closed: Bool(true),
      }).hash()
    );
    const blockHashWitness = blockHashTree.getWitness(block.height.toBigInt());
    const newBlockHashRoot = blockHashTree.getRoot();
    await blockHashInMemoryStore.mergeIntoParent();

    if (modifyTreeStore) {
      await inMemoryStore.mergeIntoParent();
    }

    return {
      afterNetworkState: methodResult,
      stateRoot: stateRoot.toBigInt(),
      blockHashRoot: newBlockHashRoot.toBigInt(),
      blockHashWitness,

      blockStateTransitions: stateTransitions.map((st) =>
        UntypedStateTransition.fromStateTransition(st)
      ),
      blockHash: block.hash.toBigInt(),
    };
  }
}
