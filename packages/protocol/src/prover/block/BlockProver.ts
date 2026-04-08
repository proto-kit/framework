import { Bool, Field, Provable, SelfProof, ZkProgram } from "o1js";
import { container, inject, injectable, injectAll } from "tsyringe";
import {
  AreProofsEnabled,
  ChildVerificationKeyService,
  CompilableModule,
  CompileArtifact,
  CompileRegistry,
  log,
  NonMethods,
  PlainZkProgram,
  provableMethod,
  reduceSequential,
  WithZkProgrammable,
  ZkProgrammable,
} from "@proto-kit/common";

import { ProtocolModule } from "../../protocol/ProtocolModule";
import {
  StateTransitionProvable,
  StateTransitionProverPublicInput,
  StateTransitionProverPublicOutput,
} from "../statetransition/StateTransitionProvable";
import { RuntimeTransaction } from "../../model/transaction/RuntimeTransaction";
import { RuntimeMethodExecutionContext } from "../../state/context/RuntimeMethodExecutionContext";
import {
  AfterBlockHookArguments,
  BeforeBlockHookArguments,
  ProvableBlockHook,
  toAfterBlockHookArgument,
  toBeforeBlockHookArgument,
} from "../../protocol/ProvableBlockHook";
import { NetworkState } from "../../model/network/NetworkState";
import { assertEqualsIf } from "../../utils/utils";
import { StateServiceProvider } from "../../state/StateServiceProvider";
import { executeHooks } from "../utils";
import {
  TransactionProvable,
  TransactionProverPublicInput,
  TransactionProverPublicOutput,
} from "../transaction/TransactionProvable";
import { Bundle } from "../accumulators/BlockHashList";

import {
  BlockArguments,
  BlockArgumentsBatch,
  BlockProof,
  BlockProvable,
  BlockProverPublicInput,
  BlockProverPublicOutput,
  BlockProverState,
  BlockProverStateInput,
  DynamicSTProof,
  DynamicTransactionProof,
} from "./BlockProvable";
import {
  BlockHashMerkleTreeWitness,
  BlockHashTreeEntry,
} from "./accummulators/BlockHashMerkleTree";

const errors = {
  propertyNotMatchingStep: (propertyName: string, step: string) =>
    `${propertyName} not matching: ${step}`,

  propertyNotMatching: (propertyName: string) => `${propertyName} not matching`,
};

type BlockHookArgument<T extends "before" | "after"> = T extends "before"
  ? BeforeBlockHookArguments
  : AfterBlockHookArguments;

export class BlockProverProgrammable extends ZkProgrammable<
  BlockProverPublicInput,
  BlockProverPublicOutput
> {
  public constructor(
    private readonly prover: BlockProver,
    private readonly blockHooks: ProvableBlockHook<unknown>[],
    private readonly stateServiceProvider: StateServiceProvider,
    private readonly childVerificationKeyService: ChildVerificationKeyService
  ) {
    super();
  }

  name = "BlockProver";

  public get areProofsEnabled(): AreProofsEnabled | undefined {
    return this.prover.areProofsEnabled;
  }

  public async executeBlockHooks<T extends "before" | "after">(
    type: T,
    hook: (
      module: ProvableBlockHook<unknown>,
      networkState: NetworkState,
      args: BlockHookArgument<T>
    ) => Promise<NetworkState>,
    hookArguments: BlockHookArgument<T>,
    inputNetworkState: NetworkState,
    isDummy: Bool
  ) {
    const transaction = RuntimeTransaction.dummyTransaction();
    const startingInputs = {
      transaction,
      networkState: inputNetworkState,
    };

    return await executeHooks(
      startingInputs,
      `${type}Block`,
      async () => {
        const executionContext = container.resolve(
          RuntimeMethodExecutionContext
        );

        return await this.blockHooks.reduce<Promise<NetworkState>>(
          async (networkStatePromise, blockHook) => {
            const networkState = await networkStatePromise;

            // Setup context for potential calls to runtime methods.
            // With the special case that we set the new networkstate for every hook
            // We also have to put in a dummy transaction for network.transaction
            executionContext.setup({
              transaction: RuntimeTransaction.dummyTransaction(),
              networkState,
            });

            return await hook(blockHook, networkState, hookArguments);
          },
          Promise.resolve(inputNetworkState)
        );
      },
      isDummy
    );
  }

  public includeSTProof(
    stateTransitionProof: DynamicSTProof,
    apply: Bool,
    stateRoot: Field,
    pendingSTBatchesHash: Field,
    witnessedRootsHash: Field
  ): {
    stateRoot: Field;
    pendingSTBatchesHash: Field;
    witnessedRootsHash: Field;
  } {
    assertEqualsIf(
      stateTransitionProof.publicInput.currentBatchStateHash,
      Field(0),
      apply,
      "State for STProof has to be empty at the start"
    );
    assertEqualsIf(
      stateTransitionProof.publicOutput.currentBatchStateHash,
      Field(0),
      apply,
      "State for STProof has to be empty at the end"
    );

    assertEqualsIf(
      stateTransitionProof.publicInput.batchesHash,
      Field(0),
      apply,
      "Batcheshash doesn't start at 0"
    );

    // Assert from state root
    assertEqualsIf(
      stateRoot,
      stateTransitionProof.publicInput.root,
      apply,
      errors.propertyNotMatching("from state root")
    );

    // Assert the stBatchesHash executed is the same
    assertEqualsIf(
      pendingSTBatchesHash,
      stateTransitionProof.publicOutput.batchesHash,
      apply,
      "Pending STBatches are not the same that have been executed by the ST proof"
    );

    // Assert root Accumulator
    assertEqualsIf(
      Field(0),
      stateTransitionProof.publicInput.witnessedRootsHash,
      apply,
      errors.propertyNotMatching("from state root")
    );
    // Assert the witnessedRootsHash created is the same
    assertEqualsIf(
      witnessedRootsHash,
      stateTransitionProof.publicOutput.witnessedRootsHash,
      apply,
      "Root accumulator Commitment is not the same that have been executed by the ST proof"
    );

    // update root only if we didn't defer
    const newRoot = Provable.if(
      apply,
      stateTransitionProof.publicOutput.root,
      stateRoot
    );
    // Reset only if we didn't defer
    const newBatchesHash = Provable.if(apply, Field(0), pendingSTBatchesHash);
    const newWitnessedRootsHash = Provable.if(
      apply,
      Field(0),
      witnessedRootsHash
    );
    return {
      stateRoot: newRoot,
      pendingSTBatchesHash: newBatchesHash,
      witnessedRootsHash: newWitnessedRootsHash,
    };
  }

  private verifySTProof(
    state: BlockProverState,
    stateTransitionProof: DynamicSTProof,
    deferSTProof: Bool
  ) {
    // Verify ST Proof only if STs have been emitted,
    // and we don't defer the verification of the STs
    // otherwise we can input a dummy proof
    const batchesEmpty = state.pendingSTBatches.commitment.equals(Field(0));
    const verifyStProof = deferSTProof.not().and(batchesEmpty.not());
    log.provable.debug("Verify STProof", verifyStProof);

    // Brought in as a constant
    const stProofVk = this.childVerificationKeyService.getAsConstant(
      "StateTransitionProver"
    );
    stateTransitionProof.verifyIf(stProofVk, verifyStProof);

    // Apply STProof if not deferred
    const stateProofResult = this.includeSTProof(
      stateTransitionProof,
      verifyStProof,
      state.stateRoot,
      state.pendingSTBatches.commitment,
      state.witnessedRoots.commitment
    );
    state.stateRoot = stateProofResult.stateRoot;
    state.pendingSTBatches.commitment = stateProofResult.pendingSTBatchesHash;
    state.witnessedRoots.commitment = stateProofResult.witnessedRootsHash;
  }

  private verifyTransactionProof(
    state: BlockProverState,
    transactionProof: DynamicTransactionProof,
    deferTransactionProof: Bool
  ) {
    // Verify Transaction proof if it has at least 1 tx and it isn't deferred
    const finalizeBlockProof = deferTransactionProof.not();
    const verifyTransactionProof = finalizeBlockProof.and(
      state.bundleList.isEmpty().not()
    );

    // Brought in as a constant
    const transactionProofVk = this.childVerificationKeyService.getAsConstant(
      "StateTransitionProver"
    );
    transactionProof.verifyIf(transactionProofVk, verifyTransactionProof);

    // Fast-forward transaction trackers by the results of the aggregated transaction proof
    // Implicitly, the 'from' values here are asserted against the publicInput, since the hashlists
    // are created out of the public input
    state.eternalTransactionsList.fastForwardIf(
      {
        from: transactionProof.publicInput.eternalTransactionsHash,
        to: transactionProof.publicOutput.eternalTransactionsHash,
      },
      verifyTransactionProof,
      "eternalTransactionsList"
    );

    state.incomingMessages.fastForwardIf(
      {
        from: transactionProof.publicInput.incomingMessagesHash,
        to: transactionProof.publicOutput.incomingMessagesHash,
      },
      verifyTransactionProof,
      "incomingMessages"
    );

    // Cancel out remainders for transaction proof
    assertEqualsIf(
      transactionProof.publicInput.bundlesHash,
      Field(0),
      verifyTransactionProof,
      "TransactionProof has to start bundles at 0"
    );

    // Fast Backwards actually, but logic holds
    state.bundleList.fastForwardIf(
      {
        from: transactionProof.publicOutput.bundlesHash,
        to: state.bundleList.empty(),
      },
      verifyTransactionProof,
      "bundles hash"
    );
  }

  private parseState(
    publicInput: BlockProverPublicInput,
    stateWitness: BlockProverStateInput,
    networkState: NetworkState,
    blockWitness: BlockHashMerkleTreeWitness
  ) {
    const hasNoStateRemained = publicInput.proverStateRemainder.equals(0);

    // If the state is supplied as a witness, we check that it is equals the PI's stateHash
    stateWitness
      .hash()
      .equals(publicInput.proverStateRemainder)
      .or(hasNoStateRemained)
      .assertTrue("Input state witness is invalid");

    const stateInputs = Provable.if(
      hasNoStateRemained,
      BlockProverStateInput,
      BlockProverStateInput.fromPublicInput(publicInput),
      stateWitness
    );

    stateInputs.networkStateHash.assertEquals(
      networkState.hash(),
      "Network state not valid"
    );

    const state = BlockProverState.blockProverFromCommitments(
      stateInputs,
      networkState,
      blockWitness
    );

    // Verify block witness validity
    const blockIndex = blockWitness.calculateIndex();

    blockIndex.assertEquals(stateInputs.blockNumber);

    blockWitness
      .calculateRoot(Field(0))
      .assertEquals(
        stateInputs.blockHashRoot,
        "Supplied block hash witness not matching state root"
      );

    return state;
  }

  private computeOutput(
    publicInput: BlockProverPublicInput,
    state: BlockProverState,
    finalizeBlockProof: Bool
  ) {
    const finalizedOutput = state.toCommitments();

    const deferredOutput = {
      ...publicInput,
    };
    deferredOutput.proverStateRemainder = finalizedOutput.hash();

    return new BlockProverPublicOutput(
      Provable.if(
        finalizeBlockProof,
        BlockProverPublicOutput,
        finalizedOutput.finalize(finalizeBlockProof),
        deferredOutput
      )
    );
  }

  @provableMethod()
  public async proveBlockBatchNoProofs(
    publicInput: BlockProverPublicInput,
    stateWitness: BlockProverStateInput,
    networkState: NetworkState,
    blockWitness: BlockHashMerkleTreeWitness,
    batch: BlockArgumentsBatch,
    finalize: Bool
  ) {
    return await this.proveBlockBatch(
      false,
      publicInput,
      stateWitness,
      networkState,
      blockWitness,
      batch,
      Bool(true),
      Bool(true),
      finalize
    );
  }

  @provableMethod()
  public async proveBlockBatchWithProofs(
    publicInput: BlockProverPublicInput,
    stateWitness: BlockProverStateInput,
    networkState: NetworkState,
    blockWitness: BlockHashMerkleTreeWitness,
    batch: BlockArgumentsBatch,
    deferSTProof: Bool,
    deferTransactionProof: Bool,
    stateTransitionProof: DynamicSTProof,
    transactionProof: DynamicTransactionProof
  ) {
    const finalize = deferTransactionProof.or(deferSTProof).not();

    return await this.proveBlockBatch(
      true,
      publicInput,
      stateWitness,
      networkState,
      blockWitness,
      batch,
      deferSTProof,
      deferTransactionProof,
      finalize,
      stateTransitionProof,
      transactionProof
    );
  }

  public async proveBlockBatch(
    doProofVerification: boolean,
    publicInput: BlockProverPublicInput,
    stateWitness: BlockProverStateInput,
    networkState: NetworkState,
    blockWitness: BlockHashMerkleTreeWitness,
    batch: BlockArgumentsBatch,
    deferSTProof: Bool,
    deferTransactionProof: Bool,
    finalize: Bool,
    stateTransitionProof?: DynamicSTProof,
    transactionProof?: DynamicTransactionProof
  ): Promise<BlockProverPublicOutput> {
    let state = this.parseState(
      publicInput,
      stateWitness,
      networkState,
      blockWitness
    );

    // Prove blocks iteratively
    state = await reduceSequential(
      batch.batch,
      async (current, block) => {
        const result = await this.proveBlock(current.copy(), block);

        this.stateServiceProvider.popCurrentStateService();

        return BlockProverState.choose(block.isDummy, current, result);
      },
      state
    );

    if (doProofVerification) {
      this.verifyTransactionProof(
        state,
        transactionProof!,
        deferTransactionProof
      );
      this.verifySTProof(state, stateTransitionProof!, deferSTProof);
    }

    return this.computeOutput(publicInput, state, finalize);
  }

  private async proveBlock(
    state: BlockProverState,
    args: BlockArguments
  ): Promise<BlockProverState> {
    const { networkState, blockWitness } = state;
    const { afterBlockRootWitness, transactionsHash, isDummy } = args;

    const startingPendingStBatches = state.pendingSTBatches.commitment;

    // 1. Execute beforeBlock hooks
    const beforeBlockArgs = toBeforeBlockHookArgument(state);
    const beforeBlockResult = await this.executeBlockHooks(
      "before",
      async (module, networkStateArg, hookArgs) =>
        await module.beforeBlock(networkStateArg, hookArgs),
      beforeBlockArgs,
      networkState,
      isDummy
    );

    state.pendingSTBatches.push(beforeBlockResult.batch);

    // 2. "Apply" TX-type BlockProof
    args.pendingSTBatchesHash.from.assertEquals(
      state.pendingSTBatches.commitment
    );
    args.witnessedRootsHash.from.assertEquals(state.witnessedRoots.commitment);
    const isEmptyBlock = transactionsHash.equals(Field(0));
    const isNotEmptyBlock = isEmptyBlock.not();

    // Check & fast-forward the stBatchHashList to after all transactions appended
    state.pendingSTBatches.fastForward(
      args.pendingSTBatchesHash,
      "Transaction proof doesn't start their STs after the beforeBlockHook"
    );
    // Same for witnessedRootsHash
    state.witnessedRoots.fastForward(
      args.witnessedRootsHash,
      "Transaction proof doesn't start with correct witnessed roots hash"
    );

    // Add block to bundles list
    const bundle = new Bundle({
      transactionsHash: transactionsHash,
      networkStateHash: beforeBlockResult.result.hash(),
      pendingSTBatchesHash: args.pendingSTBatchesHash,
      witnessedRootsHash: args.witnessedRootsHash,
    });
    state.bundleList.pushIf(bundle, isNotEmptyBlock);

    // 3.
    // Calculate new block tree root and increment witness
    // Blocknumber as the index here is already authenticated previously
    const [root, newWitness] = blockWitness.calculateRootIncrement(
      state.blockNumber,
      new BlockHashTreeEntry({
        block: {
          index: state.blockNumber,
          transactionListHash: transactionsHash,
        },
        closed: Bool(true),
      }).hash()
    );

    state.blockHashRoot = root;
    state.blockWitness = newWitness;

    state.blockNumber = state.blockNumber.add(1);

    // 4. Execute afterBlock hooks
    // Witness root
    const hasNoSTBatches = state.pendingSTBatches.commitment.equals(
      startingPendingStBatches
    );

    // TODO Cover case when we witness root but pendingSTBatches is completely empty

    state.witnessedRoots.witnessRoot(
      {
        appliedBatchListState: state.pendingSTBatches.commitment,
        root: afterBlockRootWitness.witnessedRoot,
      },
      hasNoSTBatches.not()
    );

    // Switch state service to afterBlock one
    this.stateServiceProvider.popCurrentStateService();

    // Execute hooks
    const afterBlockHookArgs = toAfterBlockHookArgument(
      state,
      afterBlockRootWitness.witnessedRoot,
      transactionsHash
    );
    const afterBlockResult = await this.executeBlockHooks(
      "after",
      async (module, networkStateArg, hookArgs) =>
        await module.afterBlock(networkStateArg, hookArgs),
      {
        ...afterBlockHookArgs,
      },
      beforeBlockResult.result,
      isDummy
    );

    // Apply state and network state changes
    state.pendingSTBatches.push(afterBlockResult.batch);
    state.networkState = afterBlockResult.result;

    return state;
  }

  @provableMethod()
  public async merge(
    publicInput: BlockProverPublicInput,
    proof1: BlockProof,
    proof2: BlockProof
  ): Promise<BlockProverPublicOutput> {
    proof1.verify();
    proof2.verify();

    function checkProperty<
      Key extends keyof NonMethods<BlockProverPublicInput>,
    >(key: Key) {
      // Check state
      publicInput[key].assertEquals(
        proof1.publicInput[key],
        errors.propertyNotMatchingStep(key, "publicInput.from -> proof1.from")
      );
      proof1.publicOutput[key].assertEquals(
        proof2.publicInput[key],
        errors.propertyNotMatchingStep(key, "proof1.to -> proof2.from")
      );
    }

    checkProperty("stateRoot");
    checkProperty("networkStateHash");
    checkProperty("blockHashRoot");
    checkProperty("eternalTransactionsHash");
    checkProperty("incomingMessagesHash");
    checkProperty("proverStateRemainder");

    return proof2.publicOutput;
  }

  /**
   * Creates the BlockProver ZkProgram.
   * Recursive linking of proofs is done via the previously
   * injected StateTransitionProver and the required AppChainProof class
   */
  public zkProgramFactory(): PlainZkProgram<
    BlockProverPublicInput,
    BlockProverPublicOutput
  >[] {
    const { prover } = this;
    const proveBlockBatchWithProofs =
      prover.proveBlockBatchWithProofs.bind(prover);
    const proveBlockBatchNoProofs = prover.proveBlockBatchNoProofs.bind(prover);
    const merge = prover.merge.bind(prover);

    const program = ZkProgram({
      name: "BlockProver",
      publicInput: BlockProverPublicInput,
      publicOutput: BlockProverPublicOutput,

      methods: {
        proveBlockBatchWithProofs: {
          privateInputs: [
            BlockProverStateInput,
            NetworkState,
            BlockHashMerkleTreeWitness,
            BlockArgumentsBatch,
            Bool,
            Bool,
            DynamicSTProof,
            DynamicTransactionProof,
          ],
          async method(
            publicInput: BlockProverPublicInput,
            stateWitness: BlockProverStateInput,
            networkState: NetworkState,
            blockWitness: BlockHashMerkleTreeWitness,
            batch: BlockArgumentsBatch,
            deferSTProof: Bool,
            deferTransactionProof: Bool,
            stateTransitionProof: DynamicSTProof,
            transactionProof: DynamicTransactionProof
          ) {
            return {
              publicOutput: await proveBlockBatchWithProofs(
                publicInput,
                stateWitness,
                networkState,
                blockWitness,
                batch,
                deferSTProof,
                deferTransactionProof,
                stateTransitionProof,
                transactionProof
              ),
            };
          },
        },

        proveBlockBatchNoProofs: {
          privateInputs: [
            BlockProverStateInput,
            NetworkState,
            BlockHashMerkleTreeWitness,
            BlockArgumentsBatch,
            Bool,
          ],
          async method(
            publicInput: BlockProverPublicInput,
            stateWitness: BlockProverStateInput,
            networkState: NetworkState,
            blockWitness: BlockHashMerkleTreeWitness,
            batch: BlockArgumentsBatch,
            finalize: Bool
          ) {
            return {
              publicOutput: await proveBlockBatchNoProofs(
                publicInput,
                stateWitness,
                networkState,
                blockWitness,
                batch,
                finalize
              ),
            };
          },
        },

        merge: {
          privateInputs: [
            SelfProof<BlockProverPublicInput, BlockProverPublicOutput>,
            SelfProof<BlockProverPublicInput, BlockProverPublicOutput>,
          ],

          async method(
            publicInput: BlockProverPublicInput,
            proof1: BlockProof,
            proof2: BlockProof
          ) {
            return { publicOutput: await merge(publicInput, proof1, proof2) };
          },
        },
      },
    });

    const methods = {
      proveBlockBatchWithProofs: program.proveBlockBatchWithProofs,
      proveBlockBatchNoProofs: program.proveBlockBatchNoProofs,
      merge: program.merge,
    };

    const SelfProofClass = ZkProgram.Proof(program);

    return [
      {
        name: program.name,
        compile: program.compile.bind(program),
        verify: program.verify.bind(program),
        analyzeMethods: program.analyzeMethods.bind(program),
        Proof: SelfProofClass,
        methods,
      },
    ];
  }
}

/**
 * BlockProver class, which aggregates a AppChainProof and
 * a StateTransitionProof into a single BlockProof, that can
 * then be merged to be committed to the base-layer contract
 */
@injectable()
export class BlockProver
  extends ProtocolModule
  implements BlockProvable, CompilableModule
{
  public zkProgrammable: BlockProverProgrammable;

  public constructor(
    @inject("StateTransitionProver")
    public readonly stateTransitionProver: WithZkProgrammable<
      StateTransitionProverPublicInput,
      StateTransitionProverPublicOutput
    > &
      StateTransitionProvable,
    @inject("TransactionProver")
    public readonly transactionProver: WithZkProgrammable<
      TransactionProverPublicInput,
      TransactionProverPublicOutput
    > &
      TransactionProvable,
    @injectAll("ProvableBlockHook")
    blockHooks: ProvableBlockHook<unknown>[],
    @inject("StateServiceProvider")
    stateServiceProvider: StateServiceProvider,
    childVerificationKeyService: ChildVerificationKeyService
  ) {
    super();
    this.zkProgrammable = new BlockProverProgrammable(
      this,
      blockHooks,
      stateServiceProvider,
      childVerificationKeyService
    );
  }

  public async compile(
    registry: CompileRegistry
  ): Promise<Record<string, CompileArtifact> | undefined> {
    await registry.sideloaded(async () => {
      await this.stateTransitionProver.compile(registry);
      await this.transactionProver.compile(registry);
    });
    return await registry.proverNeeded(async () => {
      return await this.zkProgrammable.compile(registry);
    });
  }

  public proveBlockBatchNoProofs(
    publicInput: BlockProverPublicInput,
    stateWitness: BlockProverStateInput,
    networkState: NetworkState,
    blockWitness: BlockHashMerkleTreeWitness,
    batch: BlockArgumentsBatch,
    finalize: Bool
  ): Promise<BlockProverPublicOutput> {
    return this.zkProgrammable.proveBlockBatchNoProofs(
      publicInput,
      stateWitness,
      networkState,
      blockWitness,
      batch,
      finalize
    );
  }

  public proveBlockBatchWithProofs(
    publicInput: BlockProverPublicInput,
    stateWitness: BlockProverStateInput,
    networkState: NetworkState,
    blockWitness: BlockHashMerkleTreeWitness,
    batch: BlockArgumentsBatch,
    deferSTProof: Bool,
    deferTransactionProof: Bool,
    stateTransitionProof: DynamicSTProof,
    transactionProof: DynamicTransactionProof
  ): Promise<BlockProverPublicOutput> {
    return this.zkProgrammable.proveBlockBatchWithProofs(
      publicInput,
      stateWitness,
      networkState,
      blockWitness,
      batch,
      deferSTProof,
      deferTransactionProof,
      stateTransitionProof,
      transactionProof
    );
  }

  public merge(
    publicInput: BlockProverPublicInput,
    proof1: BlockProof,
    proof2: BlockProof
  ): Promise<BlockProverPublicOutput> {
    return this.zkProgrammable.merge(publicInput, proof1, proof2);
  }
}
