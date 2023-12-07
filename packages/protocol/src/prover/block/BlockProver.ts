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
import { ProvableStateTransition } from "../../model/StateTransition";
import { ProvableTransactionHook } from "../../protocol/ProvableTransactionHook";
import { RuntimeMethodExecutionContext } from "../../state/context/RuntimeMethodExecutionContext";
import { Protocol, ProtocolModulesRecord } from "../../protocol/Protocol";
import { ProvableBlockHook } from "../../protocol/ProvableBlockHook";
import { NetworkState } from "../../model/network/NetworkState";
import { BundleTransactionPosition } from "./BundleTransactionPosition";

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

  private getBeforeBlockNetworkState(
    state: BlockProverState,
    networkState: NetworkState
  ) {
    return this.blockHooks.reduce<NetworkState>((networkState, blockHook) => {
      return blockHook.beforeBlock({
        state,
        networkState,
      });
    }, networkState);
  }

  private getAfterBlockNetworkState(
    state: BlockProverState,
    networkState: NetworkState
  ) {
    return this.blockHooks.reduce<NetworkState>((networkState, blockHook) => {
      return blockHook.afterBlock({
        state,
        networkState,
      });
    }, networkState);
  }

  private addTransactionToBundle(
    state: BlockProverState,
    stateTransitionProof: StateTransitionProof,
    appProof: Proof<void, MethodPublicOutput>,
    executionData: BlockProverExecutionData
  ): {
    state: BlockProverState;
    networkState: NetworkState;
    bundleOpened: Bool;
    bundleClosed: Bool;
  } {
    const { bundleTransactionPosition, networkState } = executionData;
    const stateTo = {
      ...state,
    };

    // Execute beforeBlook hooks and apply if it is the first tx of the bundle
    const beforeHookResult = this.getBeforeBlockNetworkState(
      state,
      networkState
    );
    const bundleOpened = bundleTransactionPosition.equals(
      BundleTransactionPosition.fromPositionType("FIRST")
    );
    const resultingNetworkState = new NetworkState(
      Provable.if(bundleOpened, NetworkState, beforeHookResult, networkState)
    );
    stateTo.networkStateHash = resultingNetworkState.hash();

    // TODO Modify bundle merkle tree as per specs

    // Append tx to transaction list
    const transactionList = new DefaultProvableHashList(
      Field,
      state.transactionsHash
    );

    const { transactionHash } = appProof.publicOutput;
    transactionList.push(transactionHash);

    stateTo.transactionsHash = transactionList.commitment;

    return {
      state: stateTo,
      networkState: resultingNetworkState,
      bundleOpened,

      bundleClosed: bundleTransactionPosition.equals(
        BundleTransactionPosition.fromPositionType("LAST")
      ),
    };
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
    };

    const bundleInclusionResult = this.addTransactionToBundle(
      state,
      stateProof,
      appProof,
      executionData
    );

    const stateTo = this.applyTransaction(
      bundleInclusionResult.state,
      stateProof,
      appProof,
      {
        transaction: executionData.transaction,
        bundleTransactionPosition: executionData.bundleTransactionPosition,
        networkState: bundleInclusionResult.networkState,
      }
    );

    // Apply afterBlock hooks
    const afterBlockNetworkState = this.getAfterBlockNetworkState(
      stateTo,
      bundleInclusionResult.networkState
    );
    const bundleClosed = executionData.bundleTransactionPosition.equals(
      BundleTransactionPosition.fromPositionType("LAST")
    );

    // We only need the hash here since this computed networkstate
    // is only used as an input in the next bundle
    const resultingNetworkStateHash = Provable.if(
      bundleClosed,
      afterBlockNetworkState.hash(),
      stateTo.networkStateHash
    );

    return new BlockProverPublicOutput({
      stateRoot: stateTo.stateRoot,
      transactionsHash: stateTo.transactionsHash,
      // eslint-disable-next-line putout/putout
      networkStateHash: resultingNetworkStateHash,
    });
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

    return new BlockProverPublicOutput({
      stateRoot: proof2.publicOutput.stateRoot,
      transactionsHash: proof2.publicOutput.transactionsHash,
      networkStateHash: proof2.publicOutput.networkStateHash,
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
export class BlockProver
  extends ProtocolModule<object>
  implements BlockProvable
{
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

  public merge(
    publicInput: BlockProverPublicInput,
    proof1: BlockProverProof,
    proof2: BlockProverProof
  ): BlockProverPublicOutput {
    return this.zkProgrammable.merge(publicInput, proof1, proof2);
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
}
