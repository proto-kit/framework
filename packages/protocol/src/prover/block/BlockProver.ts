/* eslint-disable max-lines */
import {
  Bool,
  Experimental,
  Field,
  type Proof,
  Provable,
  SelfProof,
  Struct,
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
  BlockProvable,
  BlockProverExecutionData,
  BlockProverProof,
  BlockProverPublicInput,
  BlockProverPublicOutput,
} from "./BlockProvable";
import {
  ProvableStateTransition,
  StateTransition,
} from "../../model/StateTransition";
import { ProvableTransactionHook } from "../../protocol/ProvableTransactionHook";
import { RuntimeMethodExecutionContext } from "../../state/context/RuntimeMethodExecutionContext";
import { ProvableBlockHook } from "../../protocol/ProvableBlockHook";
import { NetworkState } from "../../model/network/NetworkState";
import { BlockTransactionPosition } from "./BlockTransactionPosition";
import {
  BlockHashMerkleTreeWitness,
  BlockHashTreeEntry,
} from "./acummulators/BlockHashMerkleTree";
import { ProtocolTransaction } from "../../model/transaction/ProtocolTransaction";

const errors = {
  stateProofNotStartingAtZero: () =>
    "StateProof not starting ST-commitment at zero",

  stateTransitionsHashNotEqual: () =>
    "StateTransition list commitments are not equal",

  propertyNotMatching: (propertyName: string) => `${propertyName} not matching`,

  stateRootNotMatching: (step: string) => `StateRoots not matching ${step}`,

  transactionsHashNotMatching: (step: string) =>
    `transactions hash not matching ${step}`,
};

// Should be equal to BlockProver.PublicInput and -Output
export interface BlockProverState {
  // The current state root of the block prover
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

  blockHashRoot: Field;

  eternalTransactionsHash: Field;
}

export class BlockProverProgrammable extends ZkProgrammable<
  BlockProverPublicInput,
  BlockProverPublicOutput
> {
  public constructor(
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
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
   * @param appProof
   * @param executionData
   * @returns The new BlockProver-state to be used as public output
   */
  public applyTransaction(
    state: BlockProverState,
    stateTransitionProof: Proof<
      StateTransitionProverPublicInput,
      StateTransitionProverPublicOutput
    >,
    appProof: Proof<void, MethodPublicOutput>,
    executionData: BlockProverExecutionData
  ): BlockProverState {
    const { transaction, networkState } = executionData;

    appProof.verify();
    stateTransitionProof.verify();

    const stateTo = { ...state };

    // Checks for the stateTransitionProof and appProof matching
    stateTransitionProof.publicInput.stateTransitionsHash.assertEquals(
      Field(0),
      errors.stateProofNotStartingAtZero()
    );

    appProof.publicOutput.stateTransitionsHash.assertEquals(
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

    // Apply state if status success
    stateTo.stateRoot = Provable.if(
      appProof.publicOutput.status,
      stateTransitionProof.publicOutput.stateRoot,
      stateTransitionProof.publicOutput.protocolStateRoot
    );

    // Apply protocol state transitions
    this.assertProtocolTransitions(stateTransitionProof, executionData);

    // Check transaction signature
    transaction
      .validateSignature()
      .assertTrue("Transaction signature not valid");

    // Check transaction integrity against appProof
    const blockTransactionHash =
      RuntimeTransaction.fromProtocolTransaction(transaction).hash();

    blockTransactionHash.assertEquals(
      appProof.publicOutput.transactionHash,
      "Transactions provided in AppProof and BlockProof do not match"
    );

    // Check network state integrity against appProof
    state.networkStateHash.assertEquals(
      appProof.publicOutput.networkStateHash,
      "Network state does not match state used in AppProof"
    );
    state.networkStateHash.assertEquals(
      networkState.hash(),
      "Network state provided to BlockProver does not match the publicInput"
    );

    return stateTo;
  }

  // eslint-disable-next-line no-warning-comments, max-len
  // TODO How does this interact with the RuntimeMethodExecutionContext when executing runtimemethods?

  public assertProtocolTransitions(
    stateTransitionProof: Proof<
      StateTransitionProverPublicInput,
      StateTransitionProverPublicOutput
    >,
    executionData: BlockProverExecutionData
  ) {
    const executionContext = container.resolve(RuntimeMethodExecutionContext);
    executionContext.clear();

    // Setup context for potential calls to runtime methods.
    // This way they can use this.transaction etc. while still having provable
    // integrity between data
    executionContext.setup({
      transaction: RuntimeTransaction.fromProtocolTransaction(
        executionData.transaction
      ),

      networkState: executionData.networkState,
    });
    executionContext.beforeMethod("", "", []);

    this.transactionHooks.forEach((module) => {
      module.onTransaction(executionData);
    });

    executionContext.afterMethod();

    const { stateTransitions, status, statusMessage } =
      executionContext.current().result;

    status.assertTrue(statusMessage);

    const transitions = stateTransitions.map((transition) =>
      transition.toProvable()
    );

    const hashList = new DefaultProvableHashList(
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

  private executeBlockHooks(
    state: BlockProverState,
    inputNetworkState: NetworkState
  ): {
    networkState: NetworkState;
    stateTransitions: StateTransition<unknown>[];
  } {
    const executionContext = container.resolve(RuntimeMethodExecutionContext);
    executionContext.clear();
    executionContext.beforeMethod("", "", []);

    const resultingNetworkState = this.blockHooks.reduce<NetworkState>(
      (networkState, blockHook) => {
        // Setup context for potential calls to runtime methods.
        // With the special case that we set the new networkstate for every hook
        // We also have to put in a dummy transaction for network.transaction
        executionContext.setup({
          transaction: RuntimeTransaction.dummy(),
          networkState,
        });

        return blockHook.afterBlock({
          state,
          networkState,
        });
      },
      inputNetworkState
    );

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
    transactionHash: Field
  ): BlockProverState {
    const stateTo = {
      ...state,
    };

    // Append tx to transaction list
    const transactionList = new DefaultProvableHashList(
      Field,
      state.transactionsHash
    );

    transactionList.push(transactionHash);
    stateTo.transactionsHash = transactionList.commitment;

    // Append tx to eternal transaction list
    // eslint-disable-next-line no-warning-comments
    // TODO Change that to the a sequence-state compatible transaction struct
    const eternalTransactionList = new DefaultProvableHashList(
      Field,
      state.eternalTransactionsHash
    );

    eternalTransactionList.push(transactionHash);
    stateTo.eternalTransactionsHash = eternalTransactionList.commitment;

    return stateTo;
  }

  @provableMethod()
  public proveTransaction(
    publicInput: BlockProverPublicInput,
    stateProof: StateTransitionProof,
    appProof: Proof<void, MethodPublicOutput>,
    executionData: BlockProverExecutionData
  ): BlockProverPublicOutput {
    const state: BlockProverState = {
      transactionsHash: publicInput.transactionsHash,
      stateRoot: publicInput.stateRoot,
      networkStateHash: publicInput.networkStateHash,
      blockHashRoot: publicInput.blockHashRoot,
      eternalTransactionsHash: publicInput.eternalTransactionsHash,
    };

    const bundleInclusionState = this.addTransactionToBundle(
      state,
      appProof.publicOutput.transactionHash
    );

    const stateTo = this.applyTransaction(
      bundleInclusionState,
      stateProof,
      appProof,
      executionData
    );

    return new BlockProverPublicOutput({
      stateRoot: stateTo.stateRoot,
      transactionsHash: stateTo.transactionsHash,
      networkStateHash: stateTo.networkStateHash,
      blockHashRoot: stateTo.blockHashRoot,
      eternalTransactionsHash: stateTo.eternalTransactionsHash,
    });
  }

  @provableMethod()
  public newBlock(
    publicInput: BlockProverPublicInput,
    networkState: NetworkState,
    lastBlockWitness: BlockHashMerkleTreeWitness,
    nextBlockWitness: BlockHashMerkleTreeWitness,
    stateTransitionProof: StateTransitionProof
  ): {
    output: BlockProverPublicOutput;
    networkState: NetworkState;
  } {
    const lastBlockHash = publicInput.transactionsHash;

    networkState
      .hash()
      .assertEquals(
        publicInput.networkStateHash,
        "Network state not matching with publicInput"
      );

    // Calculate the new block index
    const nextIndex = nextBlockWitness.calculateIndex();

    // This checks a few things:
    // 1. that the previous block hasn't been closed yet
    // 2. through (1), that we operate on the latest block
    //    (since all others are already closed)
    const witnessValid = lastBlockWitness
      .calculateRoot(
        new BlockHashTreeEntry({
          transactionsHash: Field(0),
          closed: Bool(false),
        }).hash()
      )
      .equals(publicInput.blockHashRoot);

    // Either the witness was valid, or it is the genesis block,
    // in which case we don't check it (since there is no parent block)
    witnessValid
      .or(nextIndex.equals(0))
      .assertTrue("lastBlockWitness wasn't valid (nor is it the genesis block");

    // This checks that the lastWitness.index is exactly: nextWitness.index - 1
    const lastIndex = Provable.if(
      nextIndex.equals(0),
      Field(0),
      nextIndex.sub(1)
    );
    lastBlockWitness
      .calculateIndex()
      .assertEquals(lastIndex, "Index of last witness not matching");

    // Close the current block
    const rootHashAfterClosing = lastBlockWitness.calculateRoot(
      new BlockHashTreeEntry({
        transactionsHash: lastBlockHash,
        closed: Bool(true),
      }).hash()
    );

    // Check if the nextBlockWitness is valid under the new root
    // (i.e. if it has the correct altered sibling for the last block in it)
    nextBlockWitness
      .checkMembership(rootHashAfterClosing, nextIndex, Field(0))
      .assertTrue("Next block witness not valid with new root");

    // Open new block
    const resultingRootHash = nextBlockWitness.calculateRoot(
      new BlockHashTreeEntry({
        transactionsHash: Field(0),
        closed: Bool(false),
      }).hash()
    );

    // Execute beforeBlock hooks
    const state: BlockProverState = {
      ...publicInput,
    };
    const beforeBlockResult = this.executeBlockHooks(state, networkState);

    // Put all generated Statetransitions into hashlist
    const transitionsHashList = new DefaultProvableHashList(
      ProvableStateTransition
    );
    beforeBlockResult.stateTransitions
      .map((st) => st.toProvable())
      .forEach((st) => {
        transitionsHashList.push(st);
      });

    // Verify ST Proof only if STs have been emitted,
    // otherwise we can input a dummy proof
    const stsEmitted = transitionsHashList.toField().equals(0).not();
    stateTransitionProof.verifyIf(stsEmitted);

    // Assert correct inputs of ST Proof
    stateTransitionProof.publicInput.stateRoot.assertEquals(
      state.stateRoot,
      "ST Proof not matching input state root"
    );
    stateTransitionProof.publicInput.stateTransitionsHash.assertEquals(
      Field(0),
      "ST Proof input ST hash must be 0"
    );

    const newState: BlockProverState = {
      // If the STProof has been verified, take its result,
      // otherwise carry over as-is
      stateRoot: Provable.if(
        stsEmitted,
        stateTransitionProof.publicOutput.stateRoot,
        state.stateRoot
      ),

      networkStateHash: beforeBlockResult.networkState.hash(),
      transactionsHash: Field(0),
      eternalTransactionsHash: state.eternalTransactionsHash,
      blockHashRoot: resultingRootHash,
    };

    const output = new BlockProverPublicOutput({
      ...newState,
    });
    return {
      output,
      networkState: beforeBlockResult.networkState,
    };
  }

  @provableMethod()
  public merge(
    publicInput: BlockProverPublicInput,
    proof1: BlockProverProof,
    proof2: BlockProverProof
  ): BlockProverPublicOutput {
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

    // Check transaction list
    publicInput.transactionsHash.assertEquals(
      proof1.publicInput.transactionsHash,
      errors.transactionsHashNotMatching("publicInput.from -> proof1.from")
    );
    proof1.publicOutput.transactionsHash.assertEquals(
      proof2.publicInput.transactionsHash,
      errors.transactionsHashNotMatching("proof1.to -> proof2.from")
    );

    // Check networkhash
    publicInput.networkStateHash.assertEquals(
      proof1.publicInput.networkStateHash,
      errors.transactionsHashNotMatching("publicInput.from -> proof1.from")
    );
    proof1.publicOutput.networkStateHash.assertEquals(
      proof2.publicInput.networkStateHash,
      errors.transactionsHashNotMatching("proof1.to -> proof2.from")
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

    return new BlockProverPublicOutput({
      stateRoot: proof2.publicOutput.stateRoot,
      transactionsHash: proof2.publicOutput.transactionsHash,
      networkStateHash: proof2.publicOutput.networkStateHash,
      blockHashRoot: proof2.publicOutput.blockHashRoot,
      eternalTransactionsHash: proof2.publicOutput.eternalTransactionsHash,
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
    const merge = prover.merge.bind(prover);

    const program = Experimental.ZkProgram({
      publicInput: BlockProverPublicInput,
      publicOutput: BlockProverPublicOutput,

      methods: {
        proveTransaction: {
          privateInputs: [
            StateTransitionProofClass,
            RuntimeProofClass,
            BlockProverExecutionData,
          ],

          method(
            publicInput: BlockProverPublicInput,
            stateProof: StateTransitionProof,
            appProof: Proof<void, MethodPublicOutput>,
            executionData: BlockProverExecutionData
          ) {
            return proveTransaction(
              publicInput,
              stateProof,
              appProof,
              executionData
            );
          },
        },

        merge: {
          privateInputs: [
            SelfProof<BlockProverPublicInput, BlockProverPublicOutput>,
            SelfProof<BlockProverPublicInput, BlockProverPublicOutput>,
          ],

          method(
            publicInput: BlockProverPublicInput,
            proof1: BlockProverProof,
            proof2: BlockProverProof
          ) {
            return merge(publicInput, proof1, proof2);
          },
        },
      },
    });

    const methods = {
      proveTransaction: program.proveTransaction,
      merge: program.merge,
    };

    const SelfProofClass = Experimental.ZkProgram.Proof(program);

    return {
      compile: program.compile.bind(program),
      verify: program.verify.bind(program),
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
  ): BlockProverPublicOutput {
    return this.zkProgrammable.proveTransaction(
      publicInput,
      stateProof,
      appProof,
      executionData
    );
  }

  public newBlock(
    publicInput: BlockProverPublicInput,
    networkState: NetworkState,
    lastBlockWitness: BlockHashMerkleTreeWitness,
    nextBlockWitness: BlockHashMerkleTreeWitness,
    stateTransitionProof: StateTransitionProof
  ): BlockProverPublicOutput {
    return this.zkProgrammable.newBlock(
      publicInput,
      networkState,
      lastBlockWitness,
      nextBlockWitness,
      stateTransitionProof
    ).output;
  }

  public merge(
    publicInput: BlockProverPublicInput,
    proof1: BlockProverProof,
    proof2: BlockProverProof
  ): BlockProverPublicOutput {
    return this.zkProgrammable.merge(publicInput, proof1, proof2);
  }
}
