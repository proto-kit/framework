/* eslint-disable max-lines */
import { inject, injectable, injectAll, Lifecycle, scoped } from "tsyringe";
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
  CachedMerkleTreeStore,
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
import { Bool, Field } from "snarkyjs";
import { AreProofsEnabled, log } from "@proto-kit/common";
import chunk from "lodash/chunk";

import { PendingTransaction } from "../../mempool/PendingTransaction";
import { distinctByString } from "../../helpers/utils";
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

  private readonly transactionHooks: ProvableTransactionHook[];

  public constructor(
    @inject("Runtime") private readonly runtime: Runtime<never>,
    @inject("Protocol") private readonly protocol: Protocol<never>
  ) {
    this.transactionHooks = protocol.dependencyContainer.resolveAll(
      "ProvableTransactionHook"
    );
  }

  private allKeys(stateTransitions: StateTransition<unknown>[]): Field[] {
    // We have to do the distinct with strings because
    // array.indexOf() doesn't work with fields
    return stateTransitions.map((st) => st.path).filter(distinctByString);
  }

  private decodeTransaction(tx: PendingTransaction): {
    method: (...args: unknown[]) => unknown;
    args: unknown[];
    module: RuntimeModule<unknown>;
  } {
    const methodDescriptors = this.runtime.dependencyContainer
      .resolve<MethodIdResolver>("MethodIdResolver")
      .getMethodNameFromId(tx.methodId.toBigInt());

    const method = this.runtime.getMethodById(tx.methodId.toBigInt());

    if (methodDescriptors === undefined || method === undefined) {
      throw errors.methodIdNotFound(tx.methodId.toString());
    }

    const [moduleName, methodName] = methodDescriptors;
    const module: RuntimeModule<unknown> = this.runtime.resolve(moduleName);

    const parameterDecoder = MethodParameterDecoder.fromMethod(
      module,
      methodName
    );
    const args = parameterDecoder.fromFields(tx.args);

    return {
      method,
      args,
      module,
    };
  }

  private retrieveStateRecord(
    stateService: StateService,
    keys: Field[]
  ): StateRecord {
    // This has to be this detailed bc the CachedStateService collects state
    // over the whole block, but we are only interested in the keys touched
    // by this tx
    return keys
      .map<[string, Field[] | undefined]>((key) => [
        key.toString(),
        stateService.get(key),
      ])
      .reduce<StateRecord>((a, b) => {
        const [recordKey, value] = b;
        a[recordKey] = value;
        return a;
      }, {});
  }

  private async applyTransitions(
    stateService: CachedStateService,
    stateTransitions: StateTransition<unknown>[]
  ): Promise<void> {
    await Promise.all(
      // Use updated stateTransitions since only they will have the
      // right values
      stateTransitions
        .filter((st) => st.to.isSome.toBoolean())
        .map(async (st) => {
          await stateService.setAsync(st.path, st.to.toFields());
        })
    );
  }

  private getAppChainForModule(
    module: RuntimeModule<unknown>
  ): AreProofsEnabled {
    if (module.runtime === undefined) {
      throw new Error("Runtime on RuntimeModule not set");
    }
    if (module.runtime.appChain === undefined) {
      throw new Error("AppChain on Runtime not set");
    }
    const { appChain } = module.runtime;
    return appChain;
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
    computedTxs: ComputedBlockTransaction;
  }> {
    // this.witnessProviderReference.setWitnessProvider(
    //   new MerkleStoreWitnessProvider(stateServices.merkleStore)
    // );

    // Step 1 & 2
    const { executionResult, startingState } = await this.createExecutionTrace(
      stateServices.stateService,
      tx,
      networkState
    );
    const { stateTransitions, protocolTransitions, status, statusMessage } =
      executionResult;

    // Step 3
    const { stParameters, fromStateRoot } = await this.createMerkleTrace(
      stateServices.merkleStore,
      stateTransitions,
      protocolTransitions,
      status.toBoolean()
    );

    const transactionsHash = bundleTracker.commitment;
    bundleTracker.push(tx.hash());

    const trace: TransactionTrace = {
      runtimeProver: {
        tx,
        state: startingState.runtime,
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

        startingState: startingState.protocol,
      },
    };

    return {
      trace,

      computedTxs: {
        tx,
        status: status.toBoolean(),
        statusMessage,
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

    await Promise.all(
      keys.map(async (key) => {
        await merkleStore.preloadKey(key.toBigInt());
      })
    );

    const tree = new RollupMerkleTree(merkleStore);
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

    // console.log(`Starting root ${stateRoot.toString()}`);

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
        const provableTransition = transition.toProvable();

        const witness = tree.getWitness(provableTransition.path.toBigInt());

        // console.log(
        //   `Calculated root ${witness
        //     .calculateRoot(provableTransition.from.value)
        //     .toString()}`
        // );

        // eslint-disable-next-line max-len
        // Only apply ST if it is either of type protocol or the runtime succeeded
        if (
          provableTransition.to.isSome.toBoolean() &&
          (StateTransitionType.isProtocol(type) || runtimeSuccess)
        ) {
          tree.setLeaf(
            provableTransition.path.toBigInt(),
            provableTransition.to.value
          );

          stateRoot = tree.getRoot();
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

    // console.log(`Ending root ${tree.getRoot().toString()}`);

    return {
      stParameters,
      fromStateRoot: initialRoot,
    };
  }

  private executeRuntimeMethod(
    method: (...args: unknown[]) => unknown,
    args: unknown[],
    contextInputs: RuntimeMethodExecutionData
  ): RuntimeProvableMethodExecutionResult {
    // Set up context
    const executionContext = this.runtime.dependencyContainer.resolve(
      RuntimeMethodExecutionContext
    );
    executionContext.setup(contextInputs);

    // Execute method
    method(...args);

    const runtimeResult = executionContext.current().result;

    // Clear executionContext
    executionContext.afterMethod();
    executionContext.clear();

    return runtimeResult;
  }

  private executeProtocolHooks(
    runtimeContextInputs: RuntimeMethodExecutionData,
    blockContextInputs: BlockProverExecutionData,
    runUnchecked = false
  ): RuntimeProvableMethodExecutionResult {
    // Set up context
    const executionContext = this.runtime.dependencyContainer.resolve(
      RuntimeMethodExecutionContext
    );
    executionContext.setup(runtimeContextInputs);
    if (runUnchecked) {
      executionContext.setSimulated(true);
    }

    this.transactionHooks.forEach((transactionHook) => {
      transactionHook.onTransaction(blockContextInputs);
    });

    const protocolResult = executionContext.current().result;
    executionContext.afterMethod();
    executionContext.clear();

    return protocolResult;
  }

  private extractAccessedKeys(
    method: (...args: unknown[]) => unknown,
    args: unknown[],
    runtimeContextInputs: RuntimeMethodExecutionData,
    blockContextInputs: BlockProverExecutionData
  ): {
    runtimeKeys: Field[];
    protocolKeys: Field[];
  } {
    // Execute the first time with dummy service
    this.runtime.stateServiceProvider.setCurrentStateService(
      this.dummyStateService
    );

    const { stateTransitions } = this.executeRuntimeMethod(
      method,
      args,
      runtimeContextInputs
    );
    const protocolTransitions = this.executeProtocolHooks(
      runtimeContextInputs,
      blockContextInputs,
      true
    ).stateTransitions;

    log.debug(`Got ${stateTransitions.length} StateTransitions`);
    log.debug(`Got ${protocolTransitions.length} ProtocolStateTransitions`);
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    // log.debug(`Touched keys: [${accessedKeys.map((x) => x.toString())}]`);

    return {
      runtimeKeys: this.allKeys(stateTransitions),
      protocolKeys: this.allKeys(protocolTransitions),
    };
  }

  // eslint-disable-next-line max-statements
  private async createExecutionTrace(
    stateService: CachedStateService,
    tx: PendingTransaction,
    networkState: NetworkState
  ): Promise<{
    executionResult: {
      stateTransitions: StateTransition<unknown>[];
      protocolTransitions: StateTransition<unknown>[];
      status: Bool;
      statusMessage?: string;
    };
    startingState: {
      runtime: StateRecord;
      protocol: StateRecord;
    };
  }> {
    const { method, args, module } = this.decodeTransaction(tx);

    // Disable proof generation for tracing
    const appChain = this.getAppChainForModule(module);
    const previousProofsEnabled = appChain.areProofsEnabled;
    appChain.setProofsEnabled(false);

    const blockContextInputs = {
      transaction: tx.toProtocolTransaction(),
      networkState,
    };
    const runtimeContextInputs = {
      networkState,

      transaction: RuntimeTransaction.fromProtocolTransaction(
        blockContextInputs.transaction
      ),
    };
    const { runtimeKeys, protocolKeys } = this.extractAccessedKeys(
      method,
      args,
      runtimeContextInputs,
      blockContextInputs
    );

    // Preload keys
    await stateService.preloadKeys(
      runtimeKeys.concat(protocolKeys).filter(distinctByString)
    );

    // Execute second time with preloaded state. The following steps
    // generate and apply the correct STs with the right values
    this.runtime.stateServiceProvider.setCurrentStateService(stateService);
    this.protocol.stateServiceProvider.setCurrentStateService(stateService);

    // Get starting protocol state
    const startingProtocolState = this.retrieveStateRecord(
      stateService,
      protocolKeys
    );

    const protocolResult = this.executeProtocolHooks(
      runtimeContextInputs,
      blockContextInputs
    );

    log.debug(
      "PSTs:",
      protocolResult.stateTransitions.map((x) => x.toJSON())
    );

    // Apply protocol STs
    await this.applyTransitions(stateService, protocolResult.stateTransitions);

    // Now do the same for runtime STs
    // Get starting state
    const startingRuntimeState = this.retrieveStateRecord(
      stateService,
      runtimeKeys
    );

    const runtimeResult = this.executeRuntimeMethod(
      method,
      args,
      runtimeContextInputs
    );

    log.debug(
      "STs:",
      runtimeResult.stateTransitions.map((x) => x.toJSON())
    );

    // Apply runtime STs (only if the tx succeeded)
    if (runtimeResult.status.toBoolean()) {
      await this.applyTransitions(stateService, runtimeResult.stateTransitions);
    }

    // Reset global stateservice
    this.runtime.stateServiceProvider.resetToDefault();
    this.protocol.stateServiceProvider.resetToDefault();
    // Reset proofs enabled
    appChain.setProofsEnabled(previousProofsEnabled);

    return {
      executionResult: {
        stateTransitions: runtimeResult.stateTransitions,
        protocolTransitions: protocolResult.stateTransitions,
        status: runtimeResult.status,
        statusMessage: runtimeResult.statusMessage,
      },

      startingState: {
        // eslint-disable-next-line putout/putout
        runtime: startingRuntimeState,
        // eslint-disable-next-line putout/putout
        protocol: startingProtocolState,
      },
    };
  }
}
