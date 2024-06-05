import {
  Bool,
  Field,
  Poseidon,
  type Proof,
  Provable,
  SelfProof,
  ZkProgram,
} from "o1js";
import { container, inject, injectable, injectAll } from "tsyringe";
import {
  AreProofsEnabled,
  PlainZkProgram,
  provableMethod,
  WithZkProgrammable,
  ZkProgrammable,
} from "@proto-kit/common";

import { DefaultProvableHashList } from "../../utils/ProvableHashList";
import { MethodPublicOutput } from "../../model/MethodPublicOutput";
import { ProtocolModule } from "../../protocol/ProtocolModule";
import {
  StateTransitionProof,
  StateTransitionProverPublicInput,
  StateTransitionProverPublicOutput,
} from "../statetransition/StateTransitionProvable";
import { RuntimeTransaction } from "../../model/transaction/RuntimeTransaction";
import {
  ProvableStateTransition,
  StateTransition,
} from "../../model/StateTransition";
import { ProvableTransactionHook } from "../../protocol/ProvableTransactionHook";
import { RuntimeMethodExecutionContext } from "../../state/context/RuntimeMethodExecutionContext";
import { ProvableBlockHook } from "../../protocol/ProvableBlockHook";
import { NetworkState } from "../../model/network/NetworkState";
import { SignedTransaction } from "../../model/transaction/SignedTransaction";
import {
  MinaActions,
  MinaActionsHashList,
} from "../../utils/MinaPrefixedProvableHashList";
import { StateTransitionReductionList } from "../../utils/StateTransitionReductionList";

import {
  BlockProvable,
  BlockProverExecutionData,
  BlockProverProof,
  BlockProverPublicInput,
  BlockProverPublicOutput,
} from "./BlockProvable";
import {
  BlockHashMerkleTreeWitness,
  BlockHashTreeEntry,
} from "./accummulators/BlockHashMerkleTree";

const errors = {
  stateProofNotStartingAtZero: () =>
    "StateProof not starting ST-commitment at zero",

  stateTransitionsHashNotEqual: () =>
    "StateTransition list commitments are not equal",

  propertyNotMatchingStep: (propertyName: string, step: string) =>
    `${propertyName} not matching: ${step}`,

  propertyNotMatching: (propertyName: string) => `${propertyName} not matching`,

  stateRootNotMatching: (step: string) =>
    errors.propertyNotMatchingStep("StateRoots", step),

  transactionsHashNotMatching: (step: string) =>
    errors.propertyNotMatchingStep("Transactions hash", step),

  networkStateHashNotMatching: (step: string) =>
    errors.propertyNotMatchingStep("Network state hash", step),
};

// Should be equal to BlockProver.PublicInput
export interface BlockProverState {
  /**
   * The current state root of the block prover
   */
  stateRoot: Field;

  /**
   * The current commitment of the transaction-list which
   * will at the end equal the bundle hash
   */
  transactionsHash: Field;

  /**
   * The network state which gives access to values such as blockHeight
   * This value is the same for the whole batch (L2 block)
   */
  networkStateHash: Field;

  /**
   * The root of the merkle tree encoding all block hashes,
   * see `BlockHashMerkleTree`
   */
  blockHashRoot: Field;

  /**
   * A variant of the transactionsHash that is never reset.
   * Thought for usage in the sequence state mempool.
   * In comparison, transactionsHash restarts at 0 for every new block
   */
  eternalTransactionsHash: Field;

  incomingMessagesHash: Field;
}

function maxField() {
  return Field(Field.ORDER - 1n);
}

export type BlockProof = Proof<BlockProverPublicInput, BlockProverPublicOutput>;
export type RuntimeProof = Proof<void, MethodPublicOutput>;

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
    public readonly runtime: ZkProgrammable<undefined, MethodPublicOutput>,
    private readonly transactionHooks: ProvableTransactionHook<unknown>[],
    private readonly blockHooks: ProvableBlockHook<unknown>[]
  ) {
    super();
  }

  public get appChain(): AreProofsEnabled | undefined {
    return this.prover.appChain;
  }

  /**
   * Applies and checks the two proofs and applies the corresponding state
   * changes to the given state
   *
   * @param state The from-state of the BlockProver
   * @param stateTransitionProof
   * @param runtimeProof
   * @param executionData
   * @returns The new BlockProver-state to be used as public output
   */
  public async applyTransaction(
    state: BlockProverState,
    stateTransitionProof: Proof<
      StateTransitionProverPublicInput,
      StateTransitionProverPublicOutput
    >,
    runtimeProof: RuntimeProof,
    executionData: BlockProverExecutionData
  ): Promise<BlockProverState> {
    const { transaction, networkState, signature } = executionData;

    const { isMessage } = runtimeProof.publicOutput;

    runtimeProof.verify();
    stateTransitionProof.verify();

    const stateTo = { ...state };

    // Checks for the stateTransitionProof and appProof matching
    stateTransitionProof.publicInput.stateTransitionsHash.assertEquals(
      Field(0),
      errors.stateProofNotStartingAtZero()
    );
    stateTransitionProof.publicInput.protocolTransitionsHash.assertEquals(
      Field(0),
      errors.stateProofNotStartingAtZero()
    );

    runtimeProof.publicOutput.stateTransitionsHash.assertEquals(
      stateTransitionProof.publicOutput.stateTransitionsHash,
      errors.stateTransitionsHashNotEqual()
    );

    // Assert from state roots
    state.stateRoot.assertEquals(
      stateTransitionProof.publicInput.stateRoot,
      errors.propertyNotMatching("from state root")
    );
    state.stateRoot.assertEquals(
      stateTransitionProof.publicInput.protocolStateRoot,
      errors.propertyNotMatching("from protocol state root")
    );

    // Apply protocol state transitions
    await this.assertProtocolTransitions(
      stateTransitionProof,
      executionData,
      runtimeProof
    );

    // Apply state if status success
    stateTo.stateRoot = Provable.if(
      runtimeProof.publicOutput.status,
      stateTransitionProof.publicOutput.stateRoot,
      stateTransitionProof.publicOutput.protocolStateRoot
    );

    // Check transaction integrity against appProof
    const blockTransactionHash = transaction.hash();

    blockTransactionHash.assertEquals(
      runtimeProof.publicOutput.transactionHash,
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
    state.networkStateHash.assertEquals(
      runtimeProof.publicOutput.networkStateHash,
      "Network state does not match state used in AppProof"
    );
    state.networkStateHash.assertEquals(
      networkState.hash(),
      "Network state provided to BlockProver does not match the publicInput"
    );

    return stateTo;
  }

  // eslint-disable-next-line max-len
  // TODO How does this interact with the RuntimeMethodExecutionContext when executing runtimemethods?

  public async assertProtocolTransitions(
    stateTransitionProof: Proof<
      StateTransitionProverPublicInput,
      StateTransitionProverPublicOutput
    >,
    executionData: BlockProverExecutionData,
    runtimeProof: Proof<void, MethodPublicOutput>
  ) {
    const executionContext = container.resolve(RuntimeMethodExecutionContext);
    executionContext.clear();

    // Setup context for potential calls to runtime methods.
    // This way they can use this.transaction etc. while still having provable
    // integrity between data
    executionContext.setup({
      // That is why we should probably hide it from the transaction context inputs
      transaction: executionData.transaction,
      networkState: executionData.networkState,
    });
    executionContext.beforeMethod("", "", []);

    for (const module of this.transactionHooks) {
      // eslint-disable-next-line no-await-in-loop
      await module.onTransaction(executionData);
    }

    executionContext.afterMethod();

    const { stateTransitions, status, statusMessage } =
      executionContext.current().result;

    status.assertTrue(statusMessage);

    const transitions = stateTransitions.map((transition) =>
      transition.toProvable()
    );

    const hashList = new StateTransitionReductionList(
      ProvableStateTransition,
      stateTransitionProof.publicInput.protocolTransitionsHash
    );

    transitions.forEach((transition) => {
      hashList.push(transition);
    });

    stateTransitionProof.publicOutput.protocolTransitionsHash.assertEquals(
      hashList.commitment,
      "ProtocolTransitionsHash not matching the generated protocol transitions"
    );
  }

  private async executeBlockHooks(
    state: BlockProverState,
    inputNetworkState: NetworkState,
    type: "afterBlock" | "beforeBlock"
  ): Promise<{
    networkState: NetworkState;
    stateTransitions: StateTransition<unknown>[];
  }> {
    const executionContext = container.resolve(RuntimeMethodExecutionContext);
    executionContext.clear();
    executionContext.beforeMethod("", "", []);

    const resultingNetworkState = await this.blockHooks.reduce<
      Promise<NetworkState>
    >(async (networkStatePromise, blockHook) => {
      const networkState = await networkStatePromise;
      // Setup context for potential calls to runtime methods.
      // With the special case that we set the new networkstate for every hook
      // We also have to put in a dummy transaction for network.transaction
      executionContext.setup({
        transaction: RuntimeTransaction.dummyTransaction(),
        networkState,
      });

      if (type === "beforeBlock") {
        return await blockHook.beforeBlock(networkState, state);
      }
      if (type === "afterBlock") {
        return await blockHook.afterBlock(networkState, state);
      }
      throw new Error("Unreachable");
    }, Promise.resolve(inputNetworkState));

    executionContext.afterMethod();

    const { stateTransitions, status, statusMessage } =
      executionContext.current().result;

    status.assertTrue(`Block hook call failed: ${statusMessage ?? "-"}`);

    return {
      networkState: resultingNetworkState,
      stateTransitions,
    };
  }

  private addTransactionToBundle(
    state: BlockProverState,
    isMessage: Bool,
    transaction: RuntimeTransaction
  ): BlockProverState {
    const stateTo = {
      ...state,
    };

    const transactionHash = transaction.hash();

    // Append tx to transaction list
    const transactionList = new DefaultProvableHashList(
      Field,
      state.transactionsHash
    );

    transactionList.pushIf(transactionHash, isMessage.not());
    stateTo.transactionsHash = transactionList.commitment;

    // Append tx to eternal transaction list
    // TODO Change that to the a sequence-state compatible transaction struct
    const eternalTransactionList = new DefaultProvableHashList(
      Field,
      state.eternalTransactionsHash
    );

    eternalTransactionList.pushIf(transactionHash, isMessage.not());
    stateTo.eternalTransactionsHash = eternalTransactionList.commitment;

    // Append tx to incomingMessagesHash
    const actionHash = MinaActions.actionHash(transaction.hashData());

    const incomingMessagesList = new MinaActionsHashList(
      state.incomingMessagesHash
    );
    incomingMessagesList.pushIf(actionHash, isMessage);

    stateTo.incomingMessagesHash = incomingMessagesList.commitment;

    return stateTo;
  }

  @provableMethod()
  public async proveTransaction(
    publicInput: BlockProverPublicInput,
    stateProof: StateTransitionProof,
    runtimeProof: RuntimeProof,
    executionData: BlockProverExecutionData
  ): Promise<BlockProverPublicOutput> {
    const state: BlockProverState = {
      ...publicInput,
    };

    state.networkStateHash.assertEquals(
      executionData.networkState.hash(),
      "ExecutionData Networkstate doesn't equal public input hash"
    );

    const bundleInclusionState = this.addTransactionToBundle(
      state,
      runtimeProof.publicOutput.isMessage,
      executionData.transaction
    );

    const stateTo = await this.applyTransaction(
      bundleInclusionState,
      stateProof,
      runtimeProof,
      executionData
    );

    return new BlockProverPublicOutput({
      ...stateTo,
      blockNumber: maxField(),
      closed: Bool(false),
    });
  }

  private assertSTProofInput(
    stateTransitionProof: StateTransitionProof,
    stateRoot: Field
  ) {
    stateTransitionProof.publicInput.stateTransitionsHash.assertEquals(
      Field(0),
      errors.stateProofNotStartingAtZero()
    );
    stateTransitionProof.publicInput.protocolTransitionsHash.assertEquals(
      Field(0),
      errors.stateProofNotStartingAtZero()
    );

    // Assert from state roots
    stateRoot.assertEquals(
      stateTransitionProof.publicInput.stateRoot,
      errors.propertyNotMatching("from state root")
    );
  }

  @provableMethod()
  public async proveBlock(
    publicInput: BlockProverPublicInput,
    networkState: NetworkState,
    blockWitness: BlockHashMerkleTreeWitness,
    stateTransitionProof: StateTransitionProof,
    transactionProof: BlockProverProof
  ): Promise<BlockProverPublicOutput> {
    const state: BlockProverState = {
      ...publicInput,
    };

    // 1. Make assertions about the inputs
    publicInput.transactionsHash.assertEquals(
      Field(0),
      "Transactionshash has to start at 0"
    );
    publicInput.networkStateHash.assertEquals(
      networkState.hash(),
      "Wrong NetworkState supplied"
    );

    transactionProof.publicInput.transactionsHash.assertEquals(
      Field(0),
      "TransactionProof transactionshash has to start at 0"
    );
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
    transactionProof.publicInput.eternalTransactionsHash.assertEquals(
      state.eternalTransactionsHash,
      "TransactionProof starting eternalTransactionHash not matching"
    );
    transactionProof.publicInput.incomingMessagesHash.assertEquals(
      state.incomingMessagesHash,
      "TransactionProof starting incomingMessagesHash not matching"
    );

    // Verify ST Proof only if STs have been emitted,
    // otherwise we can input a dummy proof
    const stsEmitted = stateTransitionProof.publicOutput.stateTransitionsHash
      .equals(0)
      .and(stateTransitionProof.publicOutput.protocolTransitionsHash.equals(0))
      .not();
    stateTransitionProof.verifyIf(stsEmitted);

    // Verify Transaction proof if it has at least 1 tx
    // We have to compare the whole input and output because we can make no
    // assumptions about the values, since it can be an arbitrary dummy-proof
    const txProofOutput = transactionProof.publicOutput;
    const verifyTransactionProof = txProofOutput.equals(
      transactionProof.publicInput,
      txProofOutput.closed,
      txProofOutput.blockNumber
    );
    transactionProof.verifyIf(verifyTransactionProof);

    // 2. Execute beforeBlock hooks
    const beforeBlockResult = await this.executeBlockHooks(
      state,
      networkState,
      "beforeBlock"
    );

    const beforeBlockHashList = new StateTransitionReductionList(
      ProvableStateTransition
    );
    beforeBlockResult.stateTransitions.forEach((st) => {
      beforeBlockHashList.push(st.toProvable());
    });

    // We are reusing protocolSTs here as beforeBlock STs
    // TODO Not possible atm bcs we can't have a seperation between protocol/runtime state roots,
    // which we would for both before and after to be able to emit STs

    // stateTransitionProof.publicInput.protocolTransitionsHash.assertEquals(
    //   beforeBlockHashList.commitment
    // );
    // state.stateRoot = stateTransitionProof.publicInput.protocolStateRoot;

    // TODO Only for now
    beforeBlockHashList.commitment.assertEquals(
      Field(0),
      "beforeBlock() cannot emit state transitions yet"
    );

    // 4. Apply TX-type BlockProof
    transactionProof.publicInput.networkStateHash.assertEquals(
      beforeBlockResult.networkState.hash(),
      "TransactionProof networkstate hash not matching beforeBlock hook result"
    );
    transactionProof.publicInput.stateRoot.assertEquals(
      state.stateRoot,
      "TransactionProof input state root not matching blockprover state root"
    );

    state.stateRoot = transactionProof.publicOutput.stateRoot;
    state.transactionsHash = transactionProof.publicOutput.transactionsHash;
    state.eternalTransactionsHash =
      transactionProof.publicOutput.eternalTransactionsHash;
    state.incomingMessagesHash =
      transactionProof.publicOutput.incomingMessagesHash;

    // 5. Execute afterBlock hooks
    this.assertSTProofInput(stateTransitionProof, state.stateRoot);

    const afterBlockResult = await this.executeBlockHooks(
      state,
      beforeBlockResult.networkState,
      "afterBlock"
    );

    const afterBlockHashList = new StateTransitionReductionList(
      ProvableStateTransition
    );
    afterBlockResult.stateTransitions.forEach((st) => {
      afterBlockHashList.push(st.toProvable());
    });

    state.networkStateHash = afterBlockResult.networkState.hash();

    // We are reusing runtime STs here as afterBlock STs
    stateTransitionProof.publicInput.stateTransitionsHash.assertEquals(
      afterBlockHashList.commitment,
      "STProof from-ST-hash not matching generated ST-hash from afterBlock hooks"
    );
    state.stateRoot = Provable.if(
      stsEmitted,
      stateTransitionProof.publicOutput.stateRoot,
      state.stateRoot
    );

    // 6. Close block

    // Calculate the new block index
    const blockIndex = blockWitness.calculateIndex();

    blockWitness
      .calculateRoot(Field(0))
      .assertEquals(
        publicInput.blockHashRoot,
        "Supplied block hash witness not matching state root"
      );

    state.blockHashRoot = blockWitness.calculateRoot(
      new BlockHashTreeEntry({
        // Mirroring UnprovenBlock.hash()
        blockHash: Poseidon.hash([blockIndex, state.transactionsHash]),
        closed: Bool(true),
      }).hash()
    );

    return new BlockProverPublicOutput({
      ...state,
      blockNumber: blockIndex,
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

    const proof1Height = proof1.publicOutput.blockNumber;
    const proof1Closed = proof1.publicOutput.closed;
    const proof2Height = proof2.publicOutput.blockNumber;
    const proof2Closed = proof2.publicOutput.closed;

    const isValidTransactionMerge = proof1Height
      .equals(maxField())
      .and(proof2Height.equals(proof1Height))
      .and(proof1Closed.or(proof2Closed).not());

    const isValidClosedMerge = proof1Closed
      .and(proof2Closed)
      .and(proof1Height.add(1).equals(proof2Height));

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
      // Provable.if(isValidClosedMerge, Bool(true), Bool(false));
      closed: isValidClosedMerge,
      blockNumber: proof2Height,
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
  > {
    const { prover, stateTransitionProver, runtime } = this;
    const StateTransitionProofClass = stateTransitionProver.zkProgram.Proof;
    const RuntimeProofClass = runtime.zkProgram.Proof;

    const proveTransaction = prover.proveTransaction.bind(prover);
    const proveBlock = prover.proveBlock.bind(prover);
    const merge = prover.merge.bind(prover);

    const program = ZkProgram({
      name: "BlockProver",
      publicInput: BlockProverPublicInput,
      publicOutput: BlockProverPublicOutput,

      methods: {
        proveTransaction: {
          privateInputs: [
            StateTransitionProofClass,
            RuntimeProofClass,
            BlockProverExecutionData,
          ],

          async method(
            publicInput: BlockProverPublicInput,
            stateProof: StateTransitionProof,
            appProof: Proof<void, MethodPublicOutput>,
            executionData: BlockProverExecutionData
          ) {
            return await proveTransaction(
              publicInput,
              stateProof,
              appProof,
              executionData
            );
          },
        },

        proveBlock: {
          privateInputs: [
            NetworkState,
            BlockHashMerkleTreeWitness,
            StateTransitionProofClass,
            SelfProof<BlockProverPublicInput, BlockProverPublicOutput>,
          ],
          async method(
            publicInput: BlockProverPublicInput,
            networkState: NetworkState,
            blockWitness: BlockHashMerkleTreeWitness,
            stateTransitionProof: StateTransitionProof,
            transactionProof: BlockProverProof
          ) {
            return await proveBlock(
              publicInput,
              networkState,
              blockWitness,
              stateTransitionProof,
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
      merge: program.merge,
    };

    const SelfProofClass = ZkProgram.Proof(program);

    return {
      compile: program.compile.bind(program),
      verify: program.verify.bind(program),
      analyzeMethods: program.analyzeMethods.bind(program),
      Proof: SelfProofClass,
      methods,
    };
  }
}

/**
 * BlockProver class, which aggregates a AppChainProof and
 * a StateTransitionProof into a single BlockProof, that can
 * then be merged to be committed to the base-layer contract
 */
@injectable()
export class BlockProver extends ProtocolModule implements BlockProvable {
  public zkProgrammable: BlockProverProgrammable;

  public constructor(
    @inject("StateTransitionProver")
    public readonly stateTransitionProver: WithZkProgrammable<
      StateTransitionProverPublicInput,
      StateTransitionProverPublicOutput
    >,
    @inject("Runtime")
    public readonly runtime: WithZkProgrammable<undefined, MethodPublicOutput>,
    @injectAll("ProvableTransactionHook")
    transactionHooks: ProvableTransactionHook<unknown>[],
    @injectAll("ProvableBlockHook")
    blockHooks: ProvableBlockHook<unknown>[]
  ) {
    super();
    this.zkProgrammable = new BlockProverProgrammable(
      this,
      stateTransitionProver.zkProgrammable,
      runtime.zkProgrammable,
      transactionHooks,
      blockHooks
    );
  }

  public proveTransaction(
    publicInput: BlockProverPublicInput,
    stateProof: StateTransitionProof,
    appProof: Proof<void, MethodPublicOutput>,
    executionData: BlockProverExecutionData
  ): Promise<BlockProverPublicOutput> {
    return this.zkProgrammable.proveTransaction(
      publicInput,
      stateProof,
      appProof,
      executionData
    );
  }

  public proveBlock(
    publicInput: BlockProverPublicInput,
    networkState: NetworkState,
    blockWitness: BlockHashMerkleTreeWitness,
    stateTransitionProof: StateTransitionProof,
    transactionProof: BlockProverProof
  ): Promise<BlockProverPublicOutput> {
    return this.zkProgrammable.proveBlock(
      publicInput,
      networkState,
      blockWitness,
      stateTransitionProof,
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
