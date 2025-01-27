import { container, inject, injectable, Lifecycle, scoped } from "tsyringe";
import {
  BlockProverExecutionData,
  BlockProverState,
  DefaultProvableHashList,
  NetworkState,
  Protocol,
  ProtocolModulesRecord,
  ProvableTransactionHook,
  RuntimeMethodExecutionContext,
  RuntimeMethodExecutionData,
  RuntimeProvableMethodExecutionResult,
  RuntimeTransaction,
  StateTransition,
  ProvableBlockHook,
  BlockHashMerkleTree,
  StateServiceProvider,
  MandatoryProtocolModulesRecord,
  BlockHashTreeEntry,
  MinaActions,
  MinaActionsHashList,
  reduceStateTransitions,
} from "@proto-kit/protocol";
import { Bool, Field, Poseidon } from "o1js";
import {
  AreProofsEnabled,
  log,
  RollupMerkleTree,
  mapSequential,
} from "@proto-kit/common";
import {
  MethodParameterEncoder,
  Runtime,
  RuntimeModule,
  RuntimeModulesRecord,
} from "@proto-kit/module";

import { PendingTransaction } from "../../../mempool/PendingTransaction";
import { CachedStateService } from "../../../state/state/CachedStateService";
import { distinctByString } from "../../../helpers/utils";
import { CachedMerkleTreeStore } from "../../../state/merkle/CachedMerkleTreeStore";
import { AsyncMerkleTreeStore } from "../../../state/async/AsyncMerkleTreeStore";
import {
  TransactionExecutionResult,
  Block,
  BlockResult,
  BlockWithResult,
} from "../../../storage/model/Block";
import { UntypedStateTransition } from "../helpers/UntypedStateTransition";
import type { StateRecord } from "../BatchProducerModule";

const errors = {
  methodIdNotFound: (methodId: string) =>
    new Error(`Can't find runtime method with id ${methodId}`),
};

export type SomeRuntimeMethod = (...args: unknown[]) => Promise<unknown>;

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class TransactionExecutionService {
  private readonly transactionHooks: ProvableTransactionHook<unknown>[];

  private readonly blockHooks: ProvableBlockHook<unknown>[];

  public constructor(
    @inject("Runtime") private readonly runtime: Runtime<RuntimeModulesRecord>,
    @inject("Protocol")
    private readonly protocol: Protocol<
      MandatoryProtocolModulesRecord & ProtocolModulesRecord
    >,
    private readonly executionContext: RuntimeMethodExecutionContext,
    // Coming in from the appchain scope (accessible by protocol & runtime)
    @inject("StateServiceProvider")
    private readonly stateServiceProvider: StateServiceProvider
  ) {
    this.transactionHooks = protocol.dependencyContainer.resolveAll(
      "ProvableTransactionHook"
    );
    this.blockHooks =
      protocol.dependencyContainer.resolveAll("ProvableBlockHook");
  }

  private allKeys(stateTransitions: StateTransition<unknown>[]): Field[] {
    // We have to do the distinct with strings because
    // array.indexOf() doesn't work with fields
    return stateTransitions.map((st) => st.path).filter(distinctByString);
  }

  private collectStateDiff(
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

  private async decodeTransaction(tx: PendingTransaction): Promise<{
    method: SomeRuntimeMethod;
    args: unknown[];
    module: RuntimeModule<unknown>;
  }> {
    const methodDescriptors = this.runtime.methodIdResolver.getMethodNameFromId(
      tx.methodId.toBigInt()
    );

    const method = this.runtime.getMethodById(tx.methodId.toBigInt());

    if (methodDescriptors === undefined || method === undefined) {
      throw errors.methodIdNotFound(tx.methodId.toString());
    }

    const [moduleName, methodName] = methodDescriptors;
    const module: RuntimeModule<unknown> = this.runtime.resolve(moduleName);

    const parameterDecoder = MethodParameterEncoder.fromMethod(
      module,
      methodName
    );
    const args = await parameterDecoder.decode(tx.argsFields, tx.auxiliaryData);

    return {
      method,
      args,
      module,
    };
  }

  private getAppChainForModule(
    module: RuntimeModule<unknown>
  ): AreProofsEnabled {
    if (module.runtime === undefined) {
      throw new Error("Runtime on RuntimeModule not set");
    }
    if (module.runtime.areProofsEnabled === undefined) {
      throw new Error("AppChain on Runtime not set");
    }
    const { areProofsEnabled } = module.runtime;
    return areProofsEnabled;
  }

  private async executeWithExecutionContext(
    method: () => Promise<void>,
    contextInputs: RuntimeMethodExecutionData,
    runSimulated = false
  ): Promise<
    Pick<
      RuntimeProvableMethodExecutionResult,
      "stateTransitions" | "status" | "statusMessage" | "stackTrace" | "events"
    >
  > {
    // Set up context
    const executionContext = container.resolve(RuntimeMethodExecutionContext);

    executionContext.setup(contextInputs);
    executionContext.setSimulated(runSimulated);

    // Execute method
    await method();

    const { stateTransitions, status, statusMessage, events } =
      executionContext.current().result;

    const reducedSTs = reduceStateTransitions(stateTransitions);

    return {
      stateTransitions: reducedSTs,
      status,
      statusMessage,
      events,
    };
  }

  private async executeRuntimeMethod(
    method: SomeRuntimeMethod,
    args: unknown[],
    contextInputs: RuntimeMethodExecutionData
  ) {
    return await this.executeWithExecutionContext(async () => {
      await method(...args);
    }, contextInputs);
  }

  private async wrapHooksForContext(method: () => Promise<void>) {
    const executionContext = container.resolve(RuntimeMethodExecutionContext);

    executionContext.beforeMethod("protocol", "hook", []);

    await method();

    executionContext.afterMethod();
  }

  private async executeProtocolHooks(
    runtimeContextInputs: RuntimeMethodExecutionData,
    blockContextInputs: BlockProverExecutionData,
    runSimulated = false
  ) {
    return await this.executeWithExecutionContext(
      async () =>
        await this.wrapHooksForContext(async () => {
          await mapSequential(
            this.transactionHooks,
            async (transactionHook) => {
              await transactionHook.onTransaction(blockContextInputs);
            }
          );
        }),
      runtimeContextInputs,
      runSimulated
    );
  }

  /**
   * Main entry point for creating a unproven block with everything
   * attached that is needed for tracing
   */
  public async createBlock(
    stateService: CachedStateService,
    transactions: PendingTransaction[],
    lastBlockWithResult: BlockWithResult,
    allowEmptyBlocks: boolean
  ): Promise<Block | undefined> {
    const lastResult = lastBlockWithResult.result;
    const lastBlock = lastBlockWithResult.block;
    const executionResults: TransactionExecutionResult[] = [];

    const transactionsHashList = new DefaultProvableHashList(Field);
    const eternalTransactionsHashList = new DefaultProvableHashList(
      Field,
      Field(lastBlock.toEternalTransactionsHash)
    );

    const incomingMessagesList = new MinaActionsHashList(
      Field(lastBlock.toMessagesHash)
    );

    // Get used networkState by executing beforeBlock() hooks
    const networkState = await this.blockHooks.reduce<Promise<NetworkState>>(
      async (reduceNetworkState, hook) =>
        await hook.beforeBlock(await reduceNetworkState, {
          blockHashRoot: Field(lastResult.blockHashRoot),
          eternalTransactionsHash: lastBlock.toEternalTransactionsHash,
          stateRoot: Field(lastResult.stateRoot),
          transactionsHash: Field(0),
          networkStateHash: lastResult.afterNetworkState.hash(),
          incomingMessagesHash: lastBlock.toMessagesHash,
        }),
      Promise.resolve(lastResult.afterNetworkState)
    );

    for (const [, tx] of transactions.entries()) {
      try {
        // Create execution trace
        // eslint-disable-next-line no-await-in-loop
        const executionTrace = await this.createExecutionTrace(
          stateService,
          tx,
          networkState
        );

        // Push result to results and transaction onto bundle-hash
        executionResults.push(executionTrace);
        if (!tx.isMessage) {
          transactionsHashList.push(tx.hash());
          eternalTransactionsHashList.push(tx.hash());
        } else {
          const actionHash = MinaActions.actionHash(
            tx.toRuntimeTransaction().hashData()
          );

          incomingMessagesList.push(actionHash);
        }
      } catch (error) {
        if (error instanceof Error) {
          log.error("Error in inclusion of tx, skipping", error);
        }
      }
    }

    const previousBlockHash =
      lastResult.blockHash === 0n ? undefined : Field(lastResult.blockHash);

    if (executionResults.length === 0 && !allowEmptyBlocks) {
      log.info(
        "After sequencing, block has no sequencable transactions left, skipping block"
      );
      return undefined;
    }

    const block: Omit<Block, "hash"> = {
      transactions: executionResults,
      transactionsHash: transactionsHashList.commitment,
      fromEternalTransactionsHash: lastBlock.toEternalTransactionsHash,
      toEternalTransactionsHash: eternalTransactionsHashList.commitment,
      height:
        lastBlock.hash.toBigInt() !== 0n ? lastBlock.height.add(1) : Field(0),
      fromBlockHashRoot: Field(lastResult.blockHashRoot),
      fromMessagesHash: lastBlock.toMessagesHash,
      toMessagesHash: incomingMessagesList.commitment,
      previousBlockHash,

      networkState: {
        before: new NetworkState(lastResult.afterNetworkState),
        during: networkState,
      },
    };

    const hash = Block.hash(block);

    return {
      ...block,
      hash,
    };
  }

  public async generateMetadataForNextBlock(
    block: Block,
    merkleTreeStore: AsyncMerkleTreeStore,
    blockHashTreeStore: AsyncMerkleTreeStore,
    modifyTreeStore = true
  ): Promise<BlockResult> {
    // Flatten diff list into a single diff by applying them over each other
    const combinedDiff = block.transactions
      .map((tx) => {
        const transitions = tx.protocolTransitions.concat(
          tx.status.toBoolean() ? tx.stateTransitions : []
        );
        return this.collectStateDiff(transitions);
      })
      .reduce<StateRecord>((accumulator, diff) => {
        // accumulator properties will be overwritten by diff's values
        return Object.assign(accumulator, diff);
      }, {});

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
    this.executionContext.clear();
    this.executionContext.setup({
      networkState: block.networkState.during,
      transaction: RuntimeTransaction.dummyTransaction(),
    });

    const resultingNetworkState = await this.blockHooks.reduce<
      Promise<NetworkState>
    >(
      async (networkState, hook) =>
        await hook.afterBlock(await networkState, state),
      Promise.resolve(block.networkState.during)
    );

    const { stateTransitions } = this.executionContext.result;
    this.executionContext.clear();
    const reducedStateTransitions = reduceStateTransitions(stateTransitions);

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
      afterNetworkState: resultingNetworkState,
      stateRoot: stateRoot.toBigInt(),
      blockHashRoot: newBlockHashRoot.toBigInt(),
      blockHashWitness,

      blockStateTransitions: reducedStateTransitions.map((st) =>
        UntypedStateTransition.fromStateTransition(st)
      ),
      blockHash: block.hash.toBigInt(),
    };
  }

  private async createExecutionTrace(
    asyncStateService: CachedStateService,
    tx: PendingTransaction,
    networkState: NetworkState
  ): Promise<TransactionExecutionResult> {
    // TODO Use RecordingStateService -> async asProver needed
    const recordingStateService = new CachedStateService(asyncStateService);

    const { method, args, module } = await this.decodeTransaction(tx);

    // Disable proof generation for tracing
    const appChain = this.getAppChainForModule(module);
    const previousProofsEnabled = appChain.areProofsEnabled;
    appChain.setProofsEnabled(false);

    const signedTransaction = tx.toProtocolTransaction();
    const blockContextInputs: BlockProverExecutionData = {
      networkState,
      transaction: signedTransaction.transaction,
      signature: signedTransaction.signature,
    };
    const runtimeContextInputs = {
      transaction: blockContextInputs.transaction,
      networkState: blockContextInputs.networkState,
    };

    // The following steps generate and apply the correct STs with the right values
    this.stateServiceProvider.setCurrentStateService(recordingStateService);

    const protocolResult = await this.executeProtocolHooks(
      runtimeContextInputs,
      blockContextInputs
    );

    if (!protocolResult.status.toBoolean()) {
      const error = new Error(
        `Protocol hooks not executable: ${
          protocolResult.statusMessage ?? "unknown"
        }`
      );
      log.debug("Protocol hook error stack trace:", protocolResult.stackTrace);
      // Propagate stack trace from the assertion
      throw error;
    }

    log.trace(
      "PSTs:",
      JSON.stringify(
        protocolResult.stateTransitions.map((x) => x.toJSON()),
        null,
        2
      )
    );

    // Apply protocol STs
    await recordingStateService.applyStateTransitions(
      protocolResult.stateTransitions
    );

    const runtimeResult = await this.executeRuntimeMethod(
      method,
      args,
      runtimeContextInputs
    );
    log.trace(
      "STs:",
      JSON.stringify(
        runtimeResult.stateTransitions.map((x) => x.toJSON()),
        null,
        2
      )
    );

    // Apply runtime STs (only if the tx succeeded)
    if (runtimeResult.status.toBoolean()) {
      // Apply protocol STs
      await recordingStateService.applyStateTransitions(
        runtimeResult.stateTransitions
      );
    }

    await recordingStateService.mergeIntoParent();

    // Reset global stateservice
    this.stateServiceProvider.popCurrentStateService();

    // Reset proofs enabled
    appChain.setProofsEnabled(previousProofsEnabled);

    const eventsReduced: { eventName: string; data: Field[] }[] =
      runtimeResult.events.reduce(
        (acc, event) => {
          if (event.condition.toBoolean()) {
            const obj = {
              eventName: event.eventName,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
              data: event.eventType.toFields(event.event),
            };
            acc.push(obj);
          }
          return acc;
        },
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        [] as { eventName: string; data: Field[] }[]
      );
    return {
      tx,
      status: runtimeResult.status,
      statusMessage: runtimeResult.statusMessage,

      stateTransitions: runtimeResult.stateTransitions.map((st) =>
        UntypedStateTransition.fromStateTransition(st)
      ),

      protocolTransitions: protocolResult.stateTransitions.map((st) =>
        UntypedStateTransition.fromStateTransition(st)
      ),

      events: eventsReduced,
    };
  }
}
