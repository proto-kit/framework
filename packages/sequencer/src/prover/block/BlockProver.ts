import { Circuit, Experimental, Field, type Proof, SelfProof, Struct } from "snarkyjs";
import { injectable } from "tsyringe";
import { DefaultProvableHashList } from "@yab/protocol";
import { Chain, MethodPublicInput } from "@yab/module";

import { StateTransitionProver, type StateTransitionProverPublicInput } from "../statetransition/StateTransitionProver.js";

export interface BlockProverState {
  stateRoot: Field;
  transactionHash: Field;
}

export class BlockProverPublicInput extends Struct({
  fromTransactionsHash: Field,
  toTransactionsHash: Field,
  fromStateRoot: Field,
  toStateRoot: Field,
}) {}

/**
 * BlockProver class, which aggregates a AppChainProof and a StateTransitionProof into a single BlockProof, that can then be merged to be committed to the base-layer contract
 */
@injectable()
export class BlockProver {
  public constructor(private readonly stateTransitionProver: StateTransitionProver, private readonly chain: Chain<never>) {}

  /**
   * Applies and checks the two proofs and applies the corresponding state changes to the given state
   * @param state The from-state of the BlockProver
   * @param stateProof
   * @param appProof
   * @returns The new BlockProver-state to be used as public output
   */
  public applyTransaction(
    state: BlockProverState,
    stateProof: Proof<StateTransitionProverPublicInput>,
    appProof: Proof<MethodPublicInput>
  ): BlockProverState {
    const stateTo = { ...state };

    // Checks for the state- and appProof matching
    stateProof.publicInput.fromStateTransitionsHash.assertEquals(Field(0), "StateProof not starting ST-commitment at zero");

    appProof.publicInput.stateTransitionsHash.assertEquals(
      stateProof.publicInput.toStateTransitionsHash,
      "StateTransition list commitments are not equal"
    );

    appProof.verify();
    stateProof.verify();

    // Apply state if status success
    state.stateRoot.assertEquals(stateProof.publicInput.fromStateRoot, "fromStateRoot not matching");
    stateTo.stateRoot = Circuit.if(appProof.publicInput.status, stateProof.publicInput.toStateRoot, stateProof.publicInput.fromStateRoot);

    // Append tx to transaction list
    const transactionList = new DefaultProvableHashList(Field, state.transactionHash);

    const { transactionHash } = appProof.publicInput;
    transactionList.push(transactionHash);

    stateTo.transactionHash = transactionList.commitment;

    return stateTo;
  }

  public proveTransaction(
    publicInput: BlockProverPublicInput,
    stateProof: Proof<StateTransitionProverPublicInput>,
    appProof: Proof<MethodPublicInput>
  ) {
    const state: BlockProverState = {
      transactionHash: publicInput.fromTransactionsHash,
      stateRoot: publicInput.fromStateRoot,
    };

    this.applyTransaction(state, stateProof, appProof);

    publicInput.toStateRoot.assertEquals(state.stateRoot, "toStateRoot not matching");
    publicInput.toTransactionsHash.assertEquals(state.transactionHash, "toTransactionsHash does not match with computed value");
  }

  public merge(publicInput: BlockProverPublicInput, proof1: SelfProof<BlockProverPublicInput>, proof2: SelfProof<BlockProverPublicInput>) {
    // Check state
    publicInput.fromStateRoot.assertEquals(proof1.publicInput.fromStateRoot, "StateRoot step 1");
    proof1.publicInput.toStateRoot.assertEquals(proof2.publicInput.fromStateRoot, "StateRoot step 2");
    proof2.publicInput.toStateRoot.assertEquals(publicInput.toStateRoot, "StateRoot step 3");

    // Check transaction list
    publicInput.fromTransactionsHash.assertEquals(proof1.publicInput.fromTransactionsHash, "ST commitment step 1");
    proof1.publicInput.toTransactionsHash.assertEquals(proof2.publicInput.fromTransactionsHash, "ST commitment step 2");
    proof2.publicInput.toTransactionsHash.assertEquals(publicInput.fromTransactionsHash, "ST commitment step 3");
  }

  /**
   * Creates the BlockProver ZkProgram
   */
  public createZkProgram() {
    const ZkProgramProof = this.stateTransitionProver.getProofType();

    const AppChainProof = this.chain.getProofClass();

    function createProgram(instance: BlockProver) {
      return Experimental.ZkProgram({
        publicInput: BlockProverPublicInput,

        methods: {
          proveTransaction: {
            privateInputs: [ZkProgramProof, AppChainProof],

            method(
              publicInput: BlockProverPublicInput,
              stateProof: Proof<StateTransitionProverPublicInput>,
              appProof: Proof<MethodPublicInput>
            ) {
              instance.proveTransaction(publicInput, stateProof, appProof);
            },
          },

          merge: {
            privateInputs: [SelfProof<BlockProverPublicInput>, SelfProof<BlockProverPublicInput>],

            method(
              publicInput: BlockProverPublicInput,
              proof1: SelfProof<BlockProverPublicInput>,
              proof2: SelfProof<BlockProverPublicInput>
            ) {
              instance.merge(publicInput, proof1, proof2);
            },
          },
        },
      });
    }

    return createProgram(this);
  }
}
