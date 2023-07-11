/* eslint-disable max-lines */
import { container, inject } from "tsyringe";
import {
  Runtime, RuntimeMethodExecutionContext, RuntimeProvableMethodExecutionResult
} from "@yab/module";
import {
  AsyncMerkleTreeStore,
  BlockProverPublicInput, BlockProverPublicOutput,
  CachedMerkleTreeStore,
  DefaultProvableHashList,
  ProvableHashList,
  RollupMerkleTree,
  RollupMerkleWitness,
  StateTransition
} from "@yab/protocol";
import { Field, Proof } from "snarkyjs";
import { requireTrue } from "@yab/common";

import { SequencerModule } from "../../sequencer/builder/SequencerModule";
import { Mempool } from "../../mempool/Mempool";
import { PendingTransaction } from "../../mempool/PendingTransaction";
import { distinct } from "../../helpers/utils";
import { BaseLayer } from "../baselayer/BaseLayer";
import { TaskQueue } from "../../worker/queue/TaskQueue";
import { BlockStorage } from "../../storage/repositories/BlockStorage";
import { ComputedBlock } from "../../storage/model/Block";
import { PairingMapReduceFlow } from "../../worker/manager/PairingMapReduceFlow";

import { BlockTrigger } from "./trigger/BlockTrigger";
import { DummyStateService } from "./execution/DummyStateService";
import { AsyncStateService } from "./state/AsyncStateService";
import { CachedStateService } from "./execution/CachedStateService";
import {
  BlockProvingTask,
  RuntimeProvingTask,
  StateTransitionTask,
} from "./tasks/BlockProvingTask";
import { StateTransitionProofParameters } from "./tasks/StateTransitionTaskParameters";
import { RuntimeProofParameters } from "./tasks/RuntimeTaskParameters";

interface RuntimeSequencerModuleConfig {
  proofsEnabled: boolean;
}

export interface StateRecord {
  [key: string]: Field[] | undefined;
}

export interface TransactionTrace {
  runtimeProver: RuntimeProofParameters;
  stateTransitionProver: StateTransitionProofParameters;
  blockProver: BlockProverPublicInput;
}

const errors = {
  publicInputUndefined: () =>
    new Error("Public Input undefined, something went wrong during execution"),

  txRemovalFailed: () => new Error("Removal of txs from mempool failed"),
};

export class BlockProducerModule extends SequencerModule<RuntimeSequencerModuleConfig> {
  private productionInProgress = false;

  private readonly dummyStateService = new DummyStateService();

  // eslint-disable-next-line max-params
  public constructor(
    @inject("Runtime") private readonly runtime: Runtime<never>,
    @inject("Mempool") private readonly mempool: Mempool,
    @inject("BlockTrigger") private readonly blockTrigger: BlockTrigger,
    @inject("AsyncStateService")
    private readonly asyncStateService: AsyncStateService,
    @inject("AsyncMerkleStore")
    private readonly merkleStore: AsyncMerkleTreeStore,
    @inject("BaseLayer") private readonly baseLayer: BaseLayer,
    @inject("TaskQueue") private readonly taskQueue: TaskQueue,
    @inject("BlockStorage") private readonly blockStorage: BlockStorage
  ) {
    super();
  }

  private allKeys(stateTransitions: StateTransition<unknown>[]): Field[] {
    return stateTransitions.map((st) => st.path).filter(distinct);
  }

  public async start(): Promise<void> {
    // this.runtime.setProofsEnabled(this.config.proofsEnabled);

    this.blockTrigger.setProduceBlock(
      async (): Promise<ComputedBlock | undefined> => {
        const block = await this.tryProduceBlock();
        if (block !== undefined) {
          // Broadcast result on to baselayer
          await this.baseLayer.blockProduced(block);
        }
        return block;
      }
    );

    await this.blockTrigger.start();
  }

  public async tryProduceBlock(): Promise<ComputedBlock | undefined> {
    if (!this.productionInProgress) {
      return await this.produceBlock();
    }
    return undefined;
  }

  public async produceBlock(): Promise<ComputedBlock> {
    this.productionInProgress = true;

    // Get next blockheight and therefore taskId
    const lastHeight = await this.blockStorage.getCurrentBlockHeight();

    const { txs } = this.mempool.getTxs();

    const proof = await this.createBlock(txs, lastHeight + 1);

    requireTrue(this.mempool.removeTxs(txs), errors.txRemovalFailed);

    return {
      proof,
      txs,
    };
  }

  /**
   * Very naive impl for now
   *
   * How we produce Blocks (batches):
   *
   * 1. We get all pending txs from the mempool and define an order
   * 2. We execute them to get results / intermediate state-roots.
   * We define a tuple of (tx data (methodId, args), state-input, state-output)
   * as a "tx trace"
   * 3. We create tasks based on those traces
   *
   */
  public async createBlock(
    txs: PendingTransaction[],
    blockId: number
  ): Promise<Proof<BlockProverPublicInput, BlockProverPublicOutput>> {
    const stateServices = {
      stateService: new CachedStateService(this.asyncStateService),
      merkleStore: new CachedMerkleTreeStore(this.merkleStore),
    };

    const bundleTracker = new DefaultProvableHashList(Field);

    const traces = await Promise.all(
      txs.map(
        async (tx) => await this.createTrace(tx, stateServices, bundleTracker)
      )
    );

    // Init tasks based on traces
    const mappedInputs = traces.map<
      [
        StateTransitionProofParameters,
        RuntimeProofParameters,
        BlockProverPublicInput
      ]
    >((trace) => [
      trace.stateTransitionProver,
      trace.runtimeProver,
      trace.blockProver,
    ]);

    const stateTransitionTask = container.resolve(StateTransitionTask);
    const runtimeTask = container.resolve(RuntimeProvingTask);
    const blockTask = container.resolve(BlockProvingTask);

    const flow = new PairingMapReduceFlow(this.taskQueue, `block_${blockId}`, {
      // eslint-disable-next-line putout/putout
      firstPairing: stateTransitionTask,
      // eslint-disable-next-line putout/putout
      secondPairing: runtimeTask,
      // eslint-disable-next-line putout/putout
      reducingTask: blockTask,
    });

    const taskIds = mappedInputs.map((input) => input[1].tx.hash().toString());

    const proof = await flow.executePairingMapReduce(mappedInputs, taskIds);

    // Exceptions?
    await flow.close();

    return proof;
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
    tx: PendingTransaction,
    stateServices: {
      stateService: CachedStateService;
      merkleStore: CachedMerkleTreeStore;
    },
    bundleTracker: ProvableHashList<Field>
  ): Promise<TransactionTrace> {
    const method = this.runtime.getMethodById(tx.methodId.toBigInt());

    // Step 1 & 2
    const { executionResult, startingState } = await this.executeRuntimeMethod(
      stateServices.stateService,
      method
    );
    const { stateTransitions } = executionResult;

    // Step 3
    const { witnesses, fromStateRoot, toStateRoot } =
      await this.createMerkleTrace(stateServices.merkleStore, stateTransitions);

    const fromTransactionsHash = bundleTracker.commitment;
    bundleTracker.push(tx.hash());

    const trace: TransactionTrace = {
      runtimeProver: {
        tx,
        state: startingState,
      },

      stateTransitionProver: {
        publicInput: {
          stateRoot: fromStateRoot,
          // toStateRoot,
          stateTransitionsHash: Field(0),
          // toStateTransitionsHash: publicInput.stateTransitionsHash,
        },

        batch: stateTransitions.map((transition) => transition.toProvable()),

        merkleWitnesses: witnesses,
      },

      blockProver: {
        stateRoot: fromStateRoot,
        // toStateRoot,
        transactionsHash: fromTransactionsHash,
        // toTransactionsHash: bundleTracker.commitment,
      },
    };

    stateServices.merkleStore.resetWrittenNodes();

    return trace;
  }

  private async createMerkleTrace(
    merkleStore: CachedMerkleTreeStore,
    stateTransitions: StateTransition<unknown>[]
  ): Promise<{
    witnesses: RollupMerkleWitness[];
    fromStateRoot: Field;
    toStateRoot: Field;
  }> {
    const keys = this.allKeys(stateTransitions);
    await Promise.all(
      keys.map(async (key) => {
        await merkleStore.preloadKey(key.toBigInt());
      })
    );

    const tree = new RollupMerkleTree(merkleStore);

    const fromStateRoot = tree.getRoot();

    const witnesses = stateTransitions.map((transition) => {
      const witness = tree.getWitness(transition.path.toBigInt());

      const provableTransition = transition.toProvable();

      if (transition.to.isSome.toBoolean()) {
        tree.setLeaf(transition.path.toBigInt(), provableTransition.to.value);
      }
      return witness;
    });

    return {
      witnesses,
      fromStateRoot,
      toStateRoot: tree.getRoot(),
    };
  }

  private async executeRuntimeMethod(
    stateService: CachedStateService,
    method: (...args: unknown[]) => unknown,
    ...args: unknown[]
  ): Promise<{
    executionResult: RuntimeProvableMethodExecutionResult;
    startingState: StateRecord;
  }> {
    // Execute the first time with dummy service
    this.runtime.stateServiceProvider.setCurrentStateService(
      this.dummyStateService
    );
    const executionContext = this.runtime.dependencyContainer.resolve(
      RuntimeMethodExecutionContext
    );

    method(...args);

    const { stateTransitions } = executionContext.current().result;
    const accessedKeys = this.allKeys(stateTransitions);

    // Preload keys
    await stateService.preloadKeys(accessedKeys);

    // Get starting state
    // This has to be this detailed bc the CachedStateService collects state
    // over the whole block, but we are only interested in the keys touched
    // by this tx
    const startingState = accessedKeys
      .map<[string, Field[] | undefined]>((key) => [
        key.toString(),
        stateService.get(key),
      ])
      .reduce<StateRecord>((a, b) => {
        const [recordKey, value] = b;
        a[recordKey] = value;
        return a;
      }, {});

    // Execute second time with preloaded state
    this.runtime.stateServiceProvider.setCurrentStateService(stateService);

    method(...args);

    this.runtime.stateServiceProvider.resetToDefault();

    return {
      executionResult: executionContext.current().result,
      startingState,
    };
  }
}
