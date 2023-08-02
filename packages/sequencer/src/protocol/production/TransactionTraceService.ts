import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import {
  MethodParameterDecoder,
  Runtime,
  RuntimeMethodExecutionContext,
  RuntimeProvableMethodExecutionResult,
} from "@yab/module";
import {
  CachedMerkleTreeStore,
  ProvableHashList,
  RollupMerkleTree,
  RollupMerkleWitness,
  StateTransition,
} from "@yab/protocol";
import { Field } from "snarkyjs";

import { PendingTransaction } from "../../mempool/PendingTransaction";
import { distinct } from "../../helpers/utils";

import { CachedStateService } from "./execution/CachedStateService";
import type { StateRecord, TransactionTrace } from "./BlockProducerModule";
import { DummyStateService } from "./execution/DummyStateService";

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class TransactionTraceService {
  private readonly dummyStateService = new DummyStateService();

  public constructor(
    @inject("Runtime") private readonly runtime: Runtime<never>
  ) {}

  private allKeys(stateTransitions: StateTransition<unknown>[]): Field[] {
    // We have to do the distinct with strings because
    // array.indexOf() doesn't work with fields
    return stateTransitions
      .map((st) => st.path.toString())
      .filter(distinct)
      .map((string) => Field(string));
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
    // this.witnessProviderReference.setWitnessProvider(
    //   new MerkleStoreWitnessProvider(stateServices.merkleStore)
    // );

    const method = this.runtime.getMethodById(tx.methodId.toBigInt());

    const [moduleName, methodName] = this.runtime.getMethodNameFromId(
      tx.methodId.toBigInt()
    );

    const parameterDecoder = MethodParameterDecoder.fromMethod(
      this.runtime.resolve(moduleName),
      methodName
    );
    const decodedArguments = parameterDecoder.fromFields(tx.args);

    // Step 1 & 2
    const { executionResult, startingState } = await this.executeRuntimeMethod(
      stateServices.stateService,
      method,
      decodedArguments
    );
    const { stateTransitions } = executionResult;

    // Step 3
    const { witnesses, fromStateRoot } = await this.createMerkleTrace(
      stateServices.merkleStore,
      stateTransitions
    );

    const transactionsHash = bundleTracker.commitment;
    bundleTracker.push(tx.hash());

    const trace: TransactionTrace = {
      runtimeProver: {
        tx,
        state: startingState,
      },

      stateTransitionProver: {
        publicInput: {
          stateRoot: fromStateRoot,
          stateTransitionsHash: Field(0),
        },

        batch: stateTransitions.map((transition) => transition.toProvable()),

        merkleWitnesses: witnesses,
      },

      blockProver: {
        stateRoot: fromStateRoot,
        transactionsHash,
      },
    };

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
    console.log(keys.map((x) => x.toString()));
    console.log(merkleStore.getNode(keys[0].toBigInt(), 0));
    // console.log(merkleStore);

    const tree = new RollupMerkleTree(merkleStore);

    const fromStateRoot = tree.getRoot();
    console.log("FromSR", fromStateRoot.toString());
    console.log("FromSR2", merkleStore.getNode(0n, 255));

    const witnesses = stateTransitions.map((transition, index) => {
      const witness = tree.getWitness(transition.path.toBigInt());

      console.log(
        `Witness ${index}, root`,
        witness.calculateRoot(transition.toProvable().from.value).toString()
      );

      const provableTransition = transition.toProvable();

      if (transition.to.isSome.toBoolean()) {
        tree.setLeaf(
          provableTransition.path.toBigInt(),
          provableTransition.to.value
        );
      }
      console.log(
        `After witness`,
        tree.getRoot().toString()
      );
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
    args: unknown[]
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

    console.log(`keys: ${accessedKeys.map((x) => x.toString())}`);
    console.log(stateTransitions.length);

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

    const executionResult = executionContext.current().result

    // Update the stateservice
    await Promise.all(
      // Use updated stateTransitions since only they will have the right values
      executionResult.stateTransitions.map(async (st) => {
        console.log(`Setting ${st.to.toFields().map(x => x.toString())}`);
        await stateService.setAsync(st.path, st.to.toFields());
      })
    );

    return {
      executionResult,
      startingState,
    };
  }
}
