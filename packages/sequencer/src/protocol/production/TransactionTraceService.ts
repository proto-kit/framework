/* eslint-disable max-lines */
import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import {
  MethodParameterDecoder,
  Runtime,
  RuntimeMethodExecutionContext,
  RuntimeProvableMethodExecutionResult,
  MethodIdResolver,
} from "@proto-kit/module";
import {
  CachedMerkleTreeStore,
  DefaultProvableHashList,
  NetworkState,
  ProtocolConstants,
  ProvableHashList,
  ProvableStateTransition,
  RollupMerkleTree,
  RuntimeTransaction,
  StateTransition,
} from "@proto-kit/protocol";
import { Field } from "snarkyjs";
import { log } from "@proto-kit/common";
import chunk from "lodash/chunk";

import { PendingTransaction } from "../../mempool/PendingTransaction";
import { distinct } from "../../helpers/utils";
import { ComputedBlockTransaction } from "../../storage/model/Block";

import { CachedStateService } from "./execution/CachedStateService";
import type { StateRecord, TransactionTrace } from "./BlockProducerModule";
import { DummyStateService } from "./execution/DummyStateService";
import { StateTransitionProofParameters } from "./tasks/StateTransitionTaskParameters";

const errors = {
  methodIdNotFound: (methodId: string) =>
    new Error(`Can't find runtime method with id ${methodId}`),
};

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

  private decodeTransaction(tx: PendingTransaction): {
    method: (...args: unknown[]) => unknown;
    args: unknown[];
  } {
    const methodDescriptors = this.runtime.dependencyContainer
      .resolve<MethodIdResolver>("MethodIdResolver")
      .getMethodNameFromId(tx.methodId.toBigInt());

    const method = this.runtime.getMethodById(tx.methodId.toBigInt());

    if (methodDescriptors === undefined || method === undefined) {
      throw errors.methodIdNotFound(tx.methodId.toString());
    }

    const [moduleName, methodName] = methodDescriptors;

    const parameterDecoder = MethodParameterDecoder.fromMethod(
      this.runtime.resolve(moduleName),
      methodName
    );
    const args = parameterDecoder.fromFields(tx.args);

    return {
      method,
      args,
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
  public async createTrace(
    tx: PendingTransaction,
    stateServices: {
      stateService: CachedStateService;
      merkleStore: CachedMerkleTreeStore;
    },
    networkState: NetworkState,
    bundleTracker: ProvableHashList<Field>
  ): Promise<{
    trace: TransactionTrace;
    txStatus: ComputedBlockTransaction;
  }> {
    // this.witnessProviderReference.setWitnessProvider(
    //   new MerkleStoreWitnessProvider(stateServices.merkleStore)
    // );

    // Step 1 & 2
    const { executionResult, startingState } = await this.executeRuntimeMethod(
      stateServices.stateService,
      tx,
      networkState
    );
    const { stateTransitions, status, statusMessage } = executionResult;

    console.log(
      stateTransitions.map((x) =>
        ProvableStateTransition.toJSON(x.toProvable())
      )
    );

    // Step 3
    const { stParameters, fromStateRoot } = await this.createMerkleTrace(
      stateServices.merkleStore,
      stateTransitions
    );

    const transactionsHash = bundleTracker.commitment;
    bundleTracker.push(tx.hash());

    const trace: TransactionTrace = {
      runtimeProver: {
        tx,
        state: startingState,
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
      },
    };

    return {
      trace,

      txStatus: {
        tx,
        status: status.toBoolean(),
        statusMessage,
      },
    };
  }

  private async createMerkleTrace(
    merkleStore: CachedMerkleTreeStore,
    stateTransitions: StateTransition<unknown>[]
  ): Promise<{
    stParameters: StateTransitionProofParameters[];
    fromStateRoot: Field;
  }> {
    const keys = this.allKeys(stateTransitions);

    await Promise.all(
      keys.map(async (key) => {
        await merkleStore.preloadKey(key.toBigInt());
      })
    );

    const tree = new RollupMerkleTree(merkleStore);
    const fromStateRoot = tree.getRoot();

    const transitionsList = new DefaultProvableHashList(
      ProvableStateTransition
    );

    const stParameters = chunk(
      stateTransitions,
      ProtocolConstants.stateTransitionProverBatchSize
    ).map<StateTransitionProofParameters>((currentChunk) => {
      const stateRoot = tree.getRoot();
      const stateTransitionsHash = transitionsList.commitment;

      const merkleWitnesses = currentChunk.map((transition) => {
        const witness = tree.getWitness(transition.path.toBigInt());

        const provableTransition = transition.toProvable();

        if (transition.to.isSome.toBoolean()) {
          tree.setLeaf(
            provableTransition.path.toBigInt(),
            provableTransition.to.value
          );
        }

        transitionsList.pushIf(
          provableTransition,
          provableTransition.path.equals(Field(0)).not()
        );

        return witness;
      });

      // console.log(
      //   "Paths:",
      //   witnesses.map((witness) => witness.calculateIndex().toString())
      // );

      return {
        merkleWitnesses,
        batch: currentChunk.map((st) => st.toProvable()),

        publicInput: {
          stateRoot,
          stateTransitionsHash,
        },
      };
    });

    return {
      stParameters,
      fromStateRoot,
    };
  }

  // eslint-disable-next-line max-statements
  private async executeRuntimeMethod(
    stateService: CachedStateService,
    tx: PendingTransaction,
    networkState: NetworkState
  ): Promise<{
    executionResult: RuntimeProvableMethodExecutionResult;
    startingState: StateRecord;
  }> {
    const { method, args } = this.decodeTransaction(tx);

    // Execute the first time with dummy service
    this.runtime.stateServiceProvider.setCurrentStateService(
      this.dummyStateService
    );

    const executionContext = this.runtime.dependencyContainer.resolve(
      RuntimeMethodExecutionContext
    );
    // Set network state and transaction for the runtimemodule to access
    const contextInputs = {
      networkState,

      transaction: RuntimeTransaction.fromProtocolTransaction(
        tx.toProtocolTransaction()
      ),
    };
    executionContext.setup(contextInputs);

    // eslint-disable-next-line no-warning-comments
    // TODO Manually disable proofsEnabled for the first execution
    method(...args);

    const { stateTransitions } = executionContext.current().result;
    const accessedKeys = this.allKeys(stateTransitions);

    log.debug("Got", stateTransitions.length, "StateTransitions");
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    log.debug(`Touched keys: [${accessedKeys.map((x) => x.toString())}]`);

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
    // We have to set it a second time here, because the inputs are cleared
    // in afterMethod()
    executionContext.setup(contextInputs);

    method(...args);

    this.runtime.stateServiceProvider.resetToDefault();

    const executionResult = executionContext.current().result;

    log.debug(
      "STs:",
      executionResult.stateTransitions.map((x) => x.toJSON())
    );

    // Update the stateservice (only if the tx succeeded)
    if (executionResult.status.toBoolean()) {
      await Promise.all(
        // Use updated stateTransitions since only they will have the
        // right values
        executionResult.stateTransitions.map(async (st) => {
          console.log("Setting async:", st.path.toString(), st.to.toJSON());
          await stateService.setAsync(st.path, st.to.toFields());
        })
      );
    }

    return {
      executionResult,
      startingState,
    };
  }
}
