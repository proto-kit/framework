import { SequencerModule } from "../../sequencer/builder/SequencerModule";
import { container, inject } from "tsyringe";
import {
  MethodExecutionContext,
  MethodExecutionResult,
  Runtime, StateService
} from "@yab/module";
import {
  AsyncMerkleTreeStore, BlockProverPublicInput,
  CachedMerkleTreeStore, DefaultProvableHashList,
  MethodPublicInput, ProvableHashList,
  ProvableStateTransition,
  RollupMerkleTree,
  RollupMerkleWitness,
  StateTransition,
  StateTransitionProverPublicInput
} from "@yab/protocol";
import { Mempool } from "../../mempool/Mempool";
import { BlockTrigger } from "./trigger/BlockTrigger";
import { PendingTransaction } from "../../mempool/PendingTransaction";
import { DummyStateService } from "./execution/DummyStateService";
import { AsyncStateService } from "./state/AsyncStateService";
import { CachedStateService } from "./execution/CachedStateService";
import { distinct } from "../../helpers/utils";
import { Field, Proof } from "snarkyjs";
import { BaseLayer } from "../baselayer/BaseLayer";
import { BlockProvingTask } from "./tasks/BlockProvingTask";
import { TaskQueue } from "../../worker/queue/TaskQueue";
import { MapReduceDerivedInput, TwoStageTaskRunner } from "../../worker/manager/TwoStageTaskRunner";
import { StateTransitionProofParameters } from "./tasks/StateTransitionTaskParameters";
import { RuntimeProofParameters } from "./tasks/RuntimeTaskParameters";

interface RuntimeSequencerModuleConfig {
  proofsEnabled: boolean;
}

export interface StateRecord {
  [key: string]: Field[] | undefined
}

export interface TransactionTrace {
  // For MethodProver (runtime)
  tx: PendingTransaction,
  runtimeInput: MethodPublicInput;
  state: StateRecord;

  // For StateTransitionProver
  stateTransitionInput: StateTransitionProverPublicInput;
  stateTransitions: ProvableStateTransition[];
  merkleWitnesses: RollupMerkleWitness[];
  bundle: {
    fromTransactionsHash: Field;
    toTransactionHash: Field;
  };
}

const errors = {
  publicInputUndefined: () =>
    new Error("Public Input undefined, something went wrong during execution")
}

export class BlockProducerModule extends SequencerModule<RuntimeSequencerModuleConfig> {
  private productionInProgress = false;

  private readonly dummyStateService = new DummyStateService();

  public constructor(
    @inject("Runtime") private readonly runtime: Runtime<never>,
    @inject("Mempool") private readonly mempool: Mempool,
    @inject("BlockTrigger") private readonly blockTrigger: BlockTrigger,
    @inject("AsyncStateService")
    private readonly asyncStateService: AsyncStateService,
    @inject("AsyncMerkleStore") private readonly merkleStore: AsyncMerkleTreeStore,
    @inject("BaseLayer") private readonly baseLayer: BaseLayer,
    @inject("TaskQueue") private readonly taskQueue: TaskQueue
  ) {
    super();
  }

  public async start(): Promise<void> {
    this.runtime.setProofsEnabled(this.config.proofsEnabled);

    this.blockTrigger.setProduceBlock(async () => {
      await this.tryProduceBlock();
    });

    await this.blockTrigger.start();
  }

  public async tryProduceBlock() {
    if (!this.productionInProgress) {
      await this.produceBlock();
    }
  }


  public async produceBlock() {
    this.productionInProgress = true;

    const block = await this.createBlock()

    // Broadcast result on to baselayer
    this.baseLayer.blockProduced({});

    // this.mempool.clear()
  }

  /**
   * Very naive impl for now
   *
   * How we produce Blocks (batches):
   *
   * 1. We get all pending txs from the mempool and define an order
   * 2. We execute them to get results / intermediate state-roots.
   * We define a tuple of (tx data (methodId, args), state-input, state-output) as a "tx trace"
   * 3. We create tasks based on those traces
   *
   */
  public async createBlock(blockId: number): Promise<Proof<BlockProverPublicInput>> {
    const stateServices = {
      stateService: new CachedStateService(this.asyncStateService),
      merkleStore: new CachedMerkleTreeStore(this.merkleStore),
    };

    const bundleTracker = new DefaultProvableHashList(Field);

    const traces = await Promise.all(
      this.mempool.getTxs().txs.map(async (tx) => {
        return await this.createTrace(tx, stateServices, bundleTracker);
      })
    );

    // Init tasks based on traces
    const mappedInputs = traces.map<[StateTransitionProofParameters, RuntimeProofParameters, BlockProverPublicInput]>(trace => {
      return [
        {
          publicInput: trace.stateTransitionInput,
          batch: trace.stateTransitions,
          merkleWitnesses: trace.merkleWitnesses,
        },
        {
          state: trace.state,
          tx: trace.tx,
        },
        {
          fromStateRoot: trace.stateTransitionInput.fromStateRoot,
          toStateRoot: trace.stateTransitionInput.toStateRoot,
          fromTransactionsHash: trace.bundle.fromTransactionsHash,
          toTransactionsHash: trace.bundle.toTransactionHash,
        },
      ];
    });

    const task = container.resolve(BlockProvingTask);

    const runner = new TwoStageTaskRunner(this.taskQueue, `block_${blockId}`, task, task)

    const proof = await runner.executeTwoStageMapReduce(mappedInputs);

    // Exceptions?
    await runner.close();

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
   * The first execution is done with a DummyStateService to find out the accessed keys
   * that can then be cached for the actual run, which generates the correct state transitions and
   * has to be done for the next transactions to be based on the correct state.
   *
   * 2. We extract the accessed keys, download the state and put it into AppChainProveParams
   * 3. We retrieve merkle witnesses for each step and put them into StateTransitionProveParams
   *
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
    const { executionResult, startingState } =
      await this.executeRuntimeMethod(stateServices.stateService, method);
    const { stateTransitions, publicInput } = executionResult;

    if (publicInput === undefined){
      throw errors.publicInputUndefined();
    }

    // Step 3
    const { witnesses, fromStateRoot, toStateRoot } =
      await this.createMerkleTrace(stateServices.merkleStore, stateTransitions);

    const fromTransactionsHash = bundleTracker.commitment;
    bundleTracker.push(tx.hash());

    const trace: TransactionTrace = {
      tx,
      runtimeInput: publicInput,
      state: startingState,

      stateTransitionInput: {
        fromStateRoot,
        toStateRoot,
        fromStateTransitionsHash: Field(0),
        toStateTransitionsHash: publicInput.stateTransitionsHash,
      },

      stateTransitions: stateTransitions.map(transition => transition.toProvable()),
      merkleWitnesses: witnesses,

      bundle: {
        fromTransactionsHash,
        toTransactionHash: bundleTracker.commitment,
      },
    };

    this.runtime.stateServiceProvider.resetToDefault();
    stateServices.merkleStore.resetWrittenNodes();

    return trace;
  }

  private async createMerkleTrace(
    merkleStore: CachedMerkleTreeStore,
    stateTransitions: StateTransition<unknown>[]
  ): Promise<{
    witnesses: RollupMerkleWitness[],
    fromStateRoot: Field,
    toStateRoot: Field,
  }> {
    const keys = this.allKeys(stateTransitions)
    await Promise.all(
      keys.map(async key => {
        await merkleStore.preloadKey(key.toBigInt())
      })
    )

    const tree = new RollupMerkleTree(merkleStore);

    const fromStateRoot = tree.getRoot()

    const witnesses = stateTransitions.map(transition => {
      const witness = tree.getWitness(transition.path.toBigInt());

      const provableTransition = transition.toProvable()

      if(transition.to.isSome.toBoolean()){
        tree.setLeaf(transition.path.toBigInt(), provableTransition.to.value)
      }
      return witness
    })

    return {
      witnesses,
      fromStateRoot,
      toStateRoot: tree.getRoot()
    }
  }

  private async executeRuntimeMethod(
    stateService: CachedStateService,
    method: (...args: unknown[]) => unknown,
    ...args: unknown[]
  ): Promise<{
    executionResult: MethodExecutionResult<unknown>,
    startingState: StateRecord,
  }> {
    // Execute the first time with dummy service
    this.runtime.stateServiceProvider.setCurrentStateService(this.dummyStateService);
    const executionContext = this.runtime.dependencyContainer.resolve(MethodExecutionContext);

    method(...args);

    const stateTransitions = executionContext
      .current()
      .result.stateTransitions
    const accessedKeys = this.allKeys(stateTransitions)

    // Preload keys
    await stateService.preloadKeys(accessedKeys);

    // Get starting state
    // This has to be this detailed bc the CachedStateService collects state over the whole block,
    // but we are only interested in the keys touched by this tx
    const startingState = accessedKeys
      .map<[string, Field[] | undefined]>(key => [key.toString(), stateService.get(key)])
      .reduce<StateRecord>((a, b) => {
        const key = b[0];
        return {
          ...a,
          [key]: b[1],
        };
      }, {});

    // Execute second time with preloaded state
    this.runtime.stateServiceProvider.setCurrentStateService(stateService);

    method(...args);

    return{
      executionResult: executionContext.current().result,
      startingState
    };
  }

  private allKeys(stateTransitions: StateTransition<unknown>[]): Field[] {
    return stateTransitions
      .map((st) => st.path)
      .filter(distinct);
  }
}
