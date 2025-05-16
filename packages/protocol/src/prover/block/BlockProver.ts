import {
  Bool,
  Field,
  Proof,
  Provable,
  SelfProof,
  VerificationKey,
  ZkProgram,
} from "o1js";
import { container, inject, injectable, injectAll } from "tsyringe";
import {
  AreProofsEnabled,
  CompilableModule,
  CompileArtifact,
  CompileRegistry,
  log,
  MAX_FIELD,
  PlainZkProgram,
  provableMethod,
  WithZkProgrammable,
  ZkProgrammable,
} from "@proto-kit/common";

import { MethodPublicOutput } from "../../model/MethodPublicOutput";
import { ProtocolModule } from "../../protocol/ProtocolModule";
import {
  StateTransitionProof,
  StateTransitionProvable,
  StateTransitionProverPublicInput,
  StateTransitionProverPublicOutput,
} from "../statetransition/StateTransitionProvable";
import { RuntimeTransaction } from "../../model/transaction/RuntimeTransaction";
import {
  ProvableStateTransition,
  StateTransition,
} from "../../model/StateTransition";
import {
  AfterTransactionHookArguments,
  BeforeTransactionHookArguments,
  ProvableTransactionHook,
  toProvableHookBlockState,
} from "../../protocol/ProvableTransactionHook";
import {
  RuntimeMethodExecutionContext,
  RuntimeMethodExecutionData,
} from "../../state/context/RuntimeMethodExecutionContext";
import {
  AfterBlockHookArguments,
  BeforeBlockHookArguments,
  ProvableBlockHook,
  toAfterTransactionHookArgument,
  toBeforeTransactionHookArgument,
} from "../../protocol/ProvableBlockHook";
import { NetworkState } from "../../model/network/NetworkState";
import { SignedTransaction } from "../../model/transaction/SignedTransaction";
import { MinaActions } from "../../utils/MinaPrefixedProvableHashList";
import { StateTransitionReductionList } from "../accumulators/StateTransitionReductionList";
import { assertEqualsIf } from "../../utils/utils";
import { WitnessedRootWitness } from "../accumulators/WitnessedRootHashList";
import { StateServiceProvider } from "../../state/StateServiceProvider";
import { AppliedStateTransitionBatch } from "../../model/AppliedStateTransitionBatch";

import {
  BlockProvable,
  BlockProverProof,
  BlockProverPublicInput,
  BlockProverPublicOutput,
  DynamicRuntimeProof,
  BlockProverMultiTransactionExecutionData,
  BlockProverTransactionArguments,
  BlockProverSingleTransactionExecutionData,
  BlockProverState,
  BlockProverStateCommitments,
} from "./BlockProvable";
import {
  BlockHashMerkleTreeWitness,
  BlockHashTreeEntry,
} from "./accummulators/BlockHashMerkleTree";
import {
  MethodVKConfigData,
  MinimalVKTreeService,
  RuntimeVerificationKeyAttestation,
} from "./accummulators/RuntimeVerificationKeyTree";
import { RuntimeVerificationKeyRootService } from "./services/RuntimeVerificationKeyRootService";

const errors = {
  propertyNotMatchingStep: (propertyName: string, step: string) =>
    `${propertyName} not matching: ${step}`,

  propertyNotMatching: (propertyName: string) => `${propertyName} not matching`,

  stateRootNotMatching: (step: string) =>
    errors.propertyNotMatchingStep("StateRoots", step),

  transactionsHashNotMatching: (step: string) =>
    errors.propertyNotMatchingStep("Transactions hash", step),

  networkStateHashNotMatching: (step: string) =>
    errors.propertyNotMatchingStep("Network state hash", step),

  invalidZkProgramTreeRoot: () =>
    "Root hash of the provided zkProgram config witness is invalid",
};

type ApplyTransactionArguments = Omit<
  BlockProverTransactionArguments,
  "verificationKeyAttestation"
>;

export type BlockProof = Proof<BlockProverPublicInput, BlockProverPublicOutput>;

export class BlockProverProgrammable extends ZkProgrammable<
  BlockProverPublicInput,
  BlockProverPublicOutput
> {
  public constructor(
    private readonly prover: BlockProver,
    public readonly stateTransitionProver: ZkProgrammable<
      StateTransitionProverPublicInput,
      StateTransitionProverPublicOutput
    >,
    private readonly transactionHooks: ProvableTransactionHook<unknown>[],
    private readonly blockHooks: ProvableBlockHook<unknown>[],
    private readonly stateServiceProvider: StateServiceProvider,
    private readonly verificationKeyService: MinimalVKTreeService
  ) {
    super();
  }

  name = "BlockProver";

  public get areProofsEnabled(): AreProofsEnabled | undefined {
    return this.prover.areProofsEnabled;
  }

  /**
   * Applies and checks the two proofs and applies the corresponding state
   * changes to the given state.
   *
   * The rough high level workflow of this function:
   * 1. Execute beforeTransaction hooks, pushing the ST batch
   * 2. Add Transaction to bundle, meaning appending it to all the respective commitments
   * 3. Push the runtime ST batch
   * 4. Execute afterTransaction hooks, pushing the ST batch
   * 5. Some consistency checks and signature verification
   *
   * @param fromState The from-state of the BlockProver
   * @param runtimeOutput
   * @param executionData
   * @param networkState
   * @returns The new BlockProver-state to be used as public output
   */
  public async applyTransaction(
    fromState: BlockProverState,
    runtimeOutput: MethodPublicOutput,
    executionData: ApplyTransactionArguments,
    networkState: NetworkState
  ): Promise<BlockProverState> {
    const { transaction, signature } = executionData;

    let state = { ...fromState };

    const { isMessage } = runtimeOutput;

    const beforeTxHookArguments = toBeforeTransactionHookArgument(
      executionData,
      networkState,
      state
    );

    // Apply beforeTransaction hook state transitions
    const beforeBatch = await this.executeTransactionHooks(
      async (module, args) => await module.beforeTransaction(args),
      beforeTxHookArguments
    );

    state = this.addTransactionToBundle(
      state,
      runtimeOutput.isMessage,
      transaction
    );

    state.pendingSTBatches.push(beforeBatch);

    state.pendingSTBatches.push({
      batchHash: runtimeOutput.stateTransitionsHash,
      applied: runtimeOutput.status,
    });

    // Apply afterTransaction hook state transitions
    const afterTxHookArguments = toAfterTransactionHookArgument(
      executionData,
      networkState,
      state,
      runtimeOutput
    );

    // Switch to different state set for afterTx hooks
    this.stateServiceProvider.popCurrentStateService();

    const afterBatch = await this.executeTransactionHooks(
      async (module, args) => await module.afterTransaction(args),
      afterTxHookArguments
    );
    state.pendingSTBatches.push(afterBatch);

    // Check transaction integrity against appProof
    const blockTransactionHash = transaction.hash();

    blockTransactionHash.assertEquals(
      runtimeOutput.transactionHash,
      "Transactions provided in AppProof and BlockProof do not match"
    );

    // Check transaction signature
    new SignedTransaction({
      transaction,
      signature,
    })
      .validateSignature()
      .or(isMessage)
      .assertTrue("Transaction signature not valid");

    // Validate layout of transaction witness
    transaction.assertTransactionType(isMessage);

    // Check network state integrity against appProof
    state.networkState
      .hash()
      .assertEquals(
        runtimeOutput.networkStateHash,
        "Network state does not match state used in AppProof"
      );

    return state;
  }

  // eslint-disable-next-line max-len
  // TODO How does this interact with the RuntimeMethodExecutionContext when executing runtimemethods?

  /**
   * Constructs a AppliedBatch based on a list of STs and the flag whether to
   * be applied or not. The AppliedBatch is a condensed commitment to a batch
   * of STs.
   */
  private constructBatch(
    stateTransitions: StateTransition<any>[],
    applied: Bool
  ) {
    const transitions = stateTransitions.map((transition) =>
      transition.toProvable()
    );

    const hashList = new StateTransitionReductionList(ProvableStateTransition);
    transitions.forEach((transition) => {
      hashList.push(transition);
    });

    return new AppliedStateTransitionBatch({
      batchHash: hashList.commitment,
      applied,
    });
  }

  private async executeTransactionHooks<
    T extends BeforeTransactionHookArguments | AfterTransactionHookArguments,
  >(
    hook: (module: ProvableTransactionHook<unknown>, args: T) => Promise<void>,
    hookArguments: T
  ) {
    const { batch } = await this.executeHooks(hookArguments, async () => {
      for (const module of this.transactionHooks) {
        // eslint-disable-next-line no-await-in-loop
        await hook(module, hookArguments);
      }
    });
    return batch;
  }

  private async executeHooks<T>(
    contextArguments: RuntimeMethodExecutionData,
    method: () => Promise<T>
  ) {
    const executionContext = container.resolve(RuntimeMethodExecutionContext);
    executionContext.clear();

    // Setup context for potential calls to runtime methods.
    // This way they can use this.transaction etc. while still having provable
    // integrity between data
    executionContext.setup(contextArguments);
    executionContext.beforeMethod("", "", []);

    const result = await method();

    executionContext.afterMethod();

    const { stateTransitions, status, statusMessage } =
      executionContext.current().result;

    status.assertTrue(`Transaction hook call failed: ${statusMessage ?? "-"}`);

    return {
      batch: this.constructBatch(stateTransitions, Bool(true)),
      result,
    };
  }

  public async executeBlockHooks<
    T extends BeforeBlockHookArguments | AfterBlockHookArguments,
  >(
    hook: (
      module: ProvableBlockHook<unknown>,
      networkState: NetworkState,
      args: T
    ) => Promise<NetworkState>,
    hookArguments: T,
    inputNetworkState: NetworkState
  ) {
    const transaction = RuntimeTransaction.dummyTransaction();
    const startingInputs = {
      transaction,
      networkState: inputNetworkState,
    };

    return await this.executeHooks(startingInputs, async () => {
      const executionContext = container.resolve(RuntimeMethodExecutionContext);

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
    });
  }

  public addTransactionToBundle<
    T extends Pick<
      BlockProverState,
      "transactionList" | "eternalTransactionsList" | "incomingMessages"
    >,
  >(state: T, isMessage: Bool, transaction: RuntimeTransaction): T {
    const transactionHash = transaction.hash();

    // Append tx to transaction list
    state.transactionList.pushIf(transactionHash, isMessage.not());

    // Append tx to eternal transaction list
    // TODO Change that to the a sequence-state compatible transaction struct
    state.eternalTransactionsList.pushIf(transactionHash, isMessage.not());

    // Append tx to incomingMessagesHash
    const actionHash = MinaActions.actionHash(transaction.hashData());

    state.incomingMessages.pushIf(actionHash, isMessage);

    return state;
  }

  private verifyVerificationKeyAttestation(
    attestation: RuntimeVerificationKeyAttestation,
    methodId: Field
  ): VerificationKey {
    // Verify the [methodId, vk] tuple against the baked-in vk tree root
    const { verificationKey, witness: verificationKeyTreeWitness } =
      attestation;

    const root = Field(this.verificationKeyService.getRoot());
    const calculatedRoot = verificationKeyTreeWitness.calculateRoot(
      new MethodVKConfigData({
        methodId: methodId,
        vkHash: verificationKey.hash,
      }).hash()
    );
    root.assertEquals(calculatedRoot, errors.invalidZkProgramTreeRoot());

    return verificationKey;
  }

  public async proveTransactionInternal(
    fromState: BlockProverState,
    runtimeProof: DynamicRuntimeProof,
    { transaction, networkState }: BlockProverSingleTransactionExecutionData
  ): Promise<BlockProverState> {
    const verificationKey = this.verifyVerificationKeyAttestation(
      transaction.verificationKeyAttestation,
      transaction.transaction.methodId
    );

    runtimeProof.verify(verificationKey);

    return await this.applyTransaction(
      fromState,
      runtimeProof.publicOutput,
      transaction,
      networkState
    );
  }

  private staticChecks(publicInput: BlockProverPublicInput) {
    publicInput.blockNumber.assertEquals(
      MAX_FIELD,
      "blockNumber has to be MAX for transaction proofs"
    );
  }

  @provableMethod()
  public async proveTransaction(
    publicInput: BlockProverPublicInput,
    runtimeProof: DynamicRuntimeProof,
    executionData: BlockProverSingleTransactionExecutionData
  ): Promise<BlockProverPublicOutput> {
    const state = BlockProverStateCommitments.toBlockProverState(
      publicInput,
      executionData.networkState
    );

    this.staticChecks(publicInput);

    const stateTo = await this.proveTransactionInternal(
      state,
      runtimeProof,
      executionData
    );

    return new BlockProverPublicOutput({
      ...BlockProverStateCommitments.fromBlockProverState(stateTo),
      closed: Bool(false),
    });
  }

  @provableMethod()
  public async proveTransactions(
    publicInput: BlockProverPublicInput,
    runtimeProof1: DynamicRuntimeProof,
    runtimeProof2: DynamicRuntimeProof,
    executionData: BlockProverMultiTransactionExecutionData
  ): Promise<BlockProverPublicOutput> {
    const state = BlockProverStateCommitments.toBlockProverState(
      publicInput,
      executionData.networkState
    );

    this.staticChecks(publicInput);

    const state1 = await this.proveTransactionInternal(state, runtimeProof1, {
      transaction: executionData.transaction1,
      networkState: executionData.networkState,
    });

    // Switch to next state record for 2nd tx beforeTx hook
    // TODO Can be prevented by merging 1st afterTx + 2nd beforeTx
    this.stateServiceProvider.popCurrentStateService();

    const stateTo = await this.proveTransactionInternal(state1, runtimeProof2, {
      transaction: executionData.transaction2,
      networkState: executionData.networkState,
    });

    return new BlockProverPublicOutput({
      ...BlockProverStateCommitments.fromBlockProverState(stateTo),
      closed: Bool(false),
    });
  }

  public includeSTProof(
    stateTransitionProof: StateTransitionProof,
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

  @provableMethod()
  public async proveBlock(
    publicInput: BlockProverPublicInput,
    networkState: NetworkState,
    blockWitness: BlockHashMerkleTreeWitness,
    stateTransitionProof: StateTransitionProof,
    deferSTProof: Bool,
    afterBlockRootWitness: WitnessedRootWitness,
    transactionProof: BlockProverProof
  ): Promise<BlockProverPublicOutput> {
    // 1. Make assertions about the inputs
    publicInput.transactionsHash.assertEquals(
      Field(0),
      "Transactionshash has to start at 0"
    );

    // TransactionProof format checks
    transactionProof.publicInput.blockHashRoot.assertEquals(
      Field(0),
      "TransactionProof cannot carry the blockHashRoot - publicInput"
    );
    transactionProof.publicOutput.blockHashRoot.assertEquals(
      Field(0),
      "TransactionProof cannot carry the blockHashRoot - publicOutput"
    );
    transactionProof.publicInput.networkStateHash.assertEquals(
      transactionProof.publicOutput.networkStateHash,
      "TransactionProof cannot alter the network state"
    );

    const state = BlockProverStateCommitments.toBlockProverState(
      publicInput,
      networkState
    );

    // Verify Transaction proof if it has at least 1 tx - i.e. the
    // input and output doesn't match fully
    // We have to compare the whole input and output because we can make no
    // assumptions about the values, since it can be an arbitrary dummy-proof
    const txProofOutput = transactionProof.publicOutput;
    const isEmptyTransition = txProofOutput.equals(
      transactionProof.publicInput,
      txProofOutput.closed
    );
    const skipTransactionProofVerification = isEmptyTransition;
    const verifyTransactionProof = isEmptyTransition.not();
    log.provable.debug("VerifyIf TxProof", verifyTransactionProof);
    transactionProof.verifyIf(verifyTransactionProof);

    // 2. Execute beforeBlock hooks
    const beforeBlockArgs = toProvableHookBlockState(state);
    const beforeBlockResult = await this.executeBlockHooks(
      async (module, networkStateArg, args) =>
        await module.beforeBlock(networkStateArg, args),
      beforeBlockArgs,
      networkState
    );

    state.pendingSTBatches.push(beforeBlockResult.batch);

    // 4. Apply TX-type BlockProof
    transactionProof.publicInput.networkStateHash
      .equals(beforeBlockResult.result.hash())
      .or(skipTransactionProofVerification)
      .assertTrue(
        "TransactionProof networkstate hash not matching beforeBlock hook result"
      );
    transactionProof.publicInput.stateRoot.assertEquals(
      transactionProof.publicOutput.stateRoot,
      "TransactionProofs can't change the state root"
    );

    // Check that the transaction proof's STs start after the beforeBlock hook
    transactionProof.publicInput.pendingSTBatchesHash.assertEquals(
      state.pendingSTBatches.commitment,
      "Transaction proof doesn't start their STs after the beforeBlockHook"
    );
    // Fast-forward the stBatchHashList to after all transactions appended
    state.pendingSTBatches.commitment =
      transactionProof.publicOutput.pendingSTBatchesHash;

    // Fast-forward block content commitments by the results of the aggregated transaction proof
    // Implicitly, the 'from' values here are asserted against the publicInput, since the hashlists
    // are created out of the public input
    state.transactionList.fastForward({
      from: transactionProof.publicInput.transactionsHash,
      to: transactionProof.publicOutput.transactionsHash,
    });
    state.eternalTransactionsList.fastForward({
      from: transactionProof.publicInput.eternalTransactionsHash,
      to: transactionProof.publicOutput.eternalTransactionsHash,
    });
    state.incomingMessages.fastForward({
      from: transactionProof.publicInput.incomingMessagesHash,
      to: transactionProof.publicOutput.incomingMessagesHash,
    });

    // Witness root
    const isEmpty = state.pendingSTBatches.commitment.equals(0);
    isEmpty
      .implies(state.stateRoot.equals(afterBlockRootWitness.witnessedRoot))
      .assertTrue();

    state.witnessedRoots.witnessRoot(
      {
        appliedBatchListState: state.pendingSTBatches.commitment,
        root: afterBlockRootWitness.witnessedRoot,
      },
      afterBlockRootWitness.preimage,
      isEmpty.not()
    );

    // 5. Calculate the new block tree hash
    const blockIndex = blockWitness.calculateIndex();

    blockIndex.assertEquals(publicInput.blockNumber);

    blockWitness
      .calculateRoot(Field(0))
      .assertEquals(
        publicInput.blockHashRoot,
        "Supplied block hash witness not matching state root"
      );

    state.blockHashRoot = blockWitness.calculateRoot(
      new BlockHashTreeEntry({
        block: {
          index: blockIndex,
          transactionListHash: state.transactionList.commitment,
        },
        closed: Bool(true),
      }).hash()
    );

    // 6. Execute afterBlock hooks

    // Switch state service to afterBlock one
    this.stateServiceProvider.popCurrentStateService();

    const afterBlockHookArgs = toProvableHookBlockState(state);
    const afterBlockResult = await this.executeBlockHooks(
      async (module, networkStateArg, args) =>
        await module.afterBlock(networkStateArg, args),
      {
        ...afterBlockHookArgs,
        stateRoot: afterBlockRootWitness.witnessedRoot,
      },
      beforeBlockResult.result
    );

    state.pendingSTBatches.push(afterBlockResult.batch);

    state.networkState = afterBlockResult.result;

    // 7. Close block

    // Verify ST Proof only if STs have been emitted,
    // and we don't defer the verification of the STs
    // otherwise we can input a dummy proof
    const batchesEmpty = state.pendingSTBatches.commitment.equals(Field(0));
    const verifyStProof = deferSTProof.not().and(batchesEmpty.not());
    log.provable.debug("Verify STProof", verifyStProof);
    stateTransitionProof.verifyIf(verifyStProof);

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

    state.blockNumber = blockIndex.add(1);

    return new BlockProverPublicOutput({
      ...BlockProverStateCommitments.fromBlockProverState(state),
      closed: Bool(true),
    });
  }

  @provableMethod()
  public async merge(
    publicInput: BlockProverPublicInput,
    proof1: BlockProverProof,
    proof2: BlockProverProof
  ): Promise<BlockProverPublicOutput> {
    proof1.verify();
    proof2.verify();

    // Check state
    publicInput.stateRoot.assertEquals(
      proof1.publicInput.stateRoot,
      errors.stateRootNotMatching("publicInput.from -> proof1.from")
    );
    proof1.publicOutput.stateRoot.assertEquals(
      proof2.publicInput.stateRoot,
      errors.stateRootNotMatching("proof1.to -> proof2.from")
    );

    // Check transaction list hash.
    // Only assert them if these are tx proofs, skip for closed proofs
    publicInput.transactionsHash
      .equals(proof1.publicInput.transactionsHash)
      .or(proof1.publicOutput.closed)
      .assertTrue(
        errors.transactionsHashNotMatching("publicInput.from -> proof1.from")
      );
    proof1.publicOutput.transactionsHash
      .equals(proof2.publicInput.transactionsHash)
      .or(proof1.publicOutput.closed)
      .assertTrue(
        errors.transactionsHashNotMatching("proof1.to -> proof2.from")
      );

    // Check networkhash
    publicInput.networkStateHash.assertEquals(
      proof1.publicInput.networkStateHash,
      errors.networkStateHashNotMatching("publicInput.from -> proof1.from")
    );
    proof1.publicOutput.networkStateHash.assertEquals(
      proof2.publicInput.networkStateHash,
      errors.networkStateHashNotMatching("proof1.to -> proof2.from")
    );

    // Check blockHashRoot
    publicInput.blockHashRoot.assertEquals(
      proof1.publicInput.blockHashRoot,
      errors.transactionsHashNotMatching("publicInput.from -> proof1.from")
    );
    proof1.publicOutput.blockHashRoot.assertEquals(
      proof2.publicInput.blockHashRoot,
      errors.transactionsHashNotMatching("proof1.to -> proof2.from")
    );

    // Check eternalTransactionsHash
    publicInput.eternalTransactionsHash.assertEquals(
      proof1.publicInput.eternalTransactionsHash,
      errors.transactionsHashNotMatching("publicInput.from -> proof1.from")
    );
    proof1.publicOutput.eternalTransactionsHash.assertEquals(
      proof2.publicInput.eternalTransactionsHash,
      errors.transactionsHashNotMatching("proof1.to -> proof2.from")
    );

    // Check incomingMessagesHash
    publicInput.incomingMessagesHash.assertEquals(
      proof1.publicInput.incomingMessagesHash,
      errors.propertyNotMatchingStep(
        "IncomingMessagesHash",
        "publicInput.from -> proof1.from"
      )
    );
    proof1.publicOutput.incomingMessagesHash.assertEquals(
      proof2.publicInput.incomingMessagesHash,
      errors.propertyNotMatchingStep(
        "IncomingMessagesHash",
        "proof1.to -> proof2.from"
      )
    );

    // Check pendingSTBatchesHash
    publicInput.pendingSTBatchesHash.assertEquals(
      proof1.publicInput.pendingSTBatchesHash,
      errors.transactionsHashNotMatching("publicInput.from -> proof1.from")
    );
    proof1.publicOutput.pendingSTBatchesHash.assertEquals(
      proof2.publicInput.pendingSTBatchesHash,
      errors.transactionsHashNotMatching("proof1.to -> proof2.from")
    );

    // Check witnessedRootsHash
    publicInput.witnessedRootsHash.assertEquals(
      proof1.publicInput.witnessedRootsHash,
      errors.transactionsHashNotMatching("publicInput.from -> proof1.from")
    );
    proof1.publicOutput.witnessedRootsHash.assertEquals(
      proof2.publicInput.witnessedRootsHash,
      errors.transactionsHashNotMatching("proof1.to -> proof2.from")
    );

    // Assert closed indicator matches
    // (i.e. we can only merge TX-Type and Block-Type with each other)
    proof1.publicOutput.closed.assertEquals(
      proof2.publicOutput.closed,
      "Closed indicators not matching"
    );

    // Either
    // blockNumbers are unset and proofs are unclosed or
    // both blocks are closed, then they have to increment or
    // one block is closed, then height has to be the same

    // Imperative algo would look like
    // if(proof1.height == MAX && proof2.height == MAX){
    //   assert !proof1.closed && !proof2.closed;
    // }else if(proof1.closed && proof2.closed){
    //   assert proof1.height + 1 == proof2.height
    // // next one is omitted for now
    // }else if(proof1.closed || proof2.closed{
    //   assert proof1.height == proof2.height
    // }

    const proof1Closed = proof1.publicOutput.closed;
    const proof2Closed = proof2.publicOutput.closed;

    const blockNumberProgressionValid = publicInput.blockNumber
      .equals(proof1.publicInput.blockNumber)
      .and(
        proof1.publicOutput.blockNumber.equals(proof2.publicInput.blockNumber)
      );

    // For tx proofs, we check that the progression starts and end with MAX
    // in addition to that both proofs are non-closed
    const isValidTransactionMerge = publicInput.blockNumber
      .equals(MAX_FIELD)
      .and(blockNumberProgressionValid)
      .and(proof1Closed.or(proof2Closed).not());

    const isValidClosedMerge = proof1Closed
      .and(proof2Closed)
      .and(blockNumberProgressionValid);

    isValidTransactionMerge
      .or(isValidClosedMerge)
      .assertTrue("Invalid BlockProof merge");

    return new BlockProverPublicOutput({
      stateRoot: proof2.publicOutput.stateRoot,
      transactionsHash: proof2.publicOutput.transactionsHash,
      networkStateHash: proof2.publicOutput.networkStateHash,
      blockHashRoot: proof2.publicOutput.blockHashRoot,
      eternalTransactionsHash: proof2.publicOutput.eternalTransactionsHash,
      incomingMessagesHash: proof2.publicOutput.incomingMessagesHash,
      closed: isValidClosedMerge,
      blockNumber: proof2.publicOutput.blockNumber,
      pendingSTBatchesHash: proof2.publicOutput.pendingSTBatchesHash,
      witnessedRootsHash: proof2.publicOutput.witnessedRootsHash,
    });
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
    const { prover, stateTransitionProver } = this;
    const StateTransitionProofClass = stateTransitionProver.zkProgram[0].Proof;
    const proveTransaction = prover.proveTransaction.bind(prover);
    const proveTransactions = prover.proveTransactions.bind(prover);
    const proveBlock = prover.proveBlock.bind(prover);
    const merge = prover.merge.bind(prover);

    const program = ZkProgram({
      name: "BlockProver",
      publicInput: BlockProverPublicInput,
      publicOutput: BlockProverPublicOutput,

      methods: {
        proveTransaction: {
          privateInputs: [
            DynamicRuntimeProof,
            BlockProverSingleTransactionExecutionData,
          ],

          async method(
            publicInput: BlockProverPublicInput,
            runtimeProof: DynamicRuntimeProof,
            executionData: BlockProverSingleTransactionExecutionData
          ) {
            return await proveTransaction(
              publicInput,
              runtimeProof,
              executionData
            );
          },
        },

        proveTransactions: {
          privateInputs: [
            DynamicRuntimeProof,
            DynamicRuntimeProof,
            BlockProverMultiTransactionExecutionData,
          ],

          async method(
            publicInput: BlockProverPublicInput,
            runtimeProof1: DynamicRuntimeProof,
            runtimeProof2: DynamicRuntimeProof,
            executionData: BlockProverMultiTransactionExecutionData
          ) {
            return await proveTransactions(
              publicInput,
              runtimeProof1,
              runtimeProof2,
              executionData
            );
          },
        },

        proveBlock: {
          privateInputs: [
            NetworkState,
            BlockHashMerkleTreeWitness,
            StateTransitionProofClass,
            Bool,
            WitnessedRootWitness,
            SelfProof<BlockProverPublicInput, BlockProverPublicOutput>,
          ],
          async method(
            publicInput: BlockProverPublicInput,
            networkState: NetworkState,
            blockWitness: BlockHashMerkleTreeWitness,
            stateTransitionProof: StateTransitionProof,
            deferSTs: Bool,
            afterBlockRootWitness: WitnessedRootWitness,
            transactionProof: BlockProverProof
          ) {
            return await proveBlock(
              publicInput,
              networkState,
              blockWitness,
              stateTransitionProof,
              deferSTs,
              afterBlockRootWitness,
              transactionProof
            );
          },
        },

        merge: {
          privateInputs: [
            SelfProof<BlockProverPublicInput, BlockProverPublicOutput>,
            SelfProof<BlockProverPublicInput, BlockProverPublicOutput>,
          ],

          async method(
            publicInput: BlockProverPublicInput,
            proof1: BlockProverProof,
            proof2: BlockProverProof
          ) {
            return await merge(publicInput, proof1, proof2);
          },
        },
      },
    });

    const methods = {
      proveTransaction: program.proveTransaction,
      proveTransactions: program.proveTransactions,
      proveBlock: program.proveBlock,
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
    @inject("Runtime")
    public readonly runtime: WithZkProgrammable<undefined, MethodPublicOutput> &
      CompilableModule,
    @injectAll("ProvableTransactionHook")
    transactionHooks: ProvableTransactionHook<unknown>[],
    @injectAll("ProvableBlockHook")
    blockHooks: ProvableBlockHook<unknown>[],
    @inject("StateServiceProvider")
    stateServiceProvider: StateServiceProvider,
    verificationKeyService: RuntimeVerificationKeyRootService
  ) {
    super();
    this.zkProgrammable = new BlockProverProgrammable(
      this,
      stateTransitionProver.zkProgrammable,
      transactionHooks,
      blockHooks,
      stateServiceProvider,
      verificationKeyService
    );
  }

  public async compile(
    registry: CompileRegistry
  ): Promise<Record<string, CompileArtifact> | undefined> {
    await registry.forceProverExists(async () => {
      await this.stateTransitionProver.compile(registry);
      await this.runtime.compile(registry);
    });

    return await this.zkProgrammable.compile(registry);
  }

  public proveTransaction(
    publicInput: BlockProverPublicInput,
    runtimeProof: DynamicRuntimeProof,
    executionData: BlockProverSingleTransactionExecutionData
  ): Promise<BlockProverPublicOutput> {
    return this.zkProgrammable.proveTransaction(
      publicInput,
      runtimeProof,
      executionData
    );
  }

  public proveTransactions(
    publicInput: BlockProverPublicInput,
    runtimeProof1: DynamicRuntimeProof,
    runtimeProof2: DynamicRuntimeProof,
    executionData: BlockProverMultiTransactionExecutionData
  ): Promise<BlockProverPublicOutput> {
    return this.zkProgrammable.proveTransactions(
      publicInput,
      runtimeProof1,
      runtimeProof2,
      executionData
    );
  }

  public proveBlock(
    publicInput: BlockProverPublicInput,
    networkState: NetworkState,
    blockWitness: BlockHashMerkleTreeWitness,
    stateTransitionProof: StateTransitionProof,
    deferSTs: Bool,
    afterBlockRootWitness: WitnessedRootWitness,
    transactionProof: BlockProverProof
  ): Promise<BlockProverPublicOutput> {
    return this.zkProgrammable.proveBlock(
      publicInput,
      networkState,
      blockWitness,
      stateTransitionProof,
      deferSTs,
      afterBlockRootWitness,
      transactionProof
    );
  }

  public merge(
    publicInput: BlockProverPublicInput,
    proof1: BlockProverProof,
    proof2: BlockProverProof
  ): Promise<BlockProverPublicOutput> {
    return this.zkProgrammable.merge(publicInput, proof1, proof2);
  }
}
