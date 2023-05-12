import { Circuit, Experimental, Field, type Proof, SelfProof, Struct } from "snarkyjs";
import { injectable } from "tsyringe";
import {
  StateTransitionProver,
  type StateTransitionProverPublicInput,
  StateTransitionProverState
} from "../statetransition/StateTransitionProver.js";
import { DefaultProvableHashList } from "@yab/protocol";
import { AppChainProof } from "./AppChainProof.js";

export type BlockProverComputationState = {
  stateRoot: Field;
  transactionsHash: Field;
};

export class BlockProverState extends Struct({
  transactionsHash: Field, // TODO name it BundleHash?
  stateRoot: Field,
}) {}

@injectable()
export class BlockProver {

  private readonly stateTransitionProver: StateTransitionProver;

  public constructor(stateTransitionProver: StateTransitionProver) {
    this.stateTransitionProver = stateTransitionProver;
  }

  public applyTransaction(
    state: BlockProverState,
    stateProof: Proof<StateTransitionProverState, StateTransitionProverState>,
    appProof: AppChainProof
  ): BlockProverState {

    const stateTo = { ...state }

    // Checks for the state- and appProof matching
    stateProof.publicInput.stateTransitionsHash.assertEquals(Field(0), "StateProof not starting ST-commitment at zero");

    appProof.publicOutput.stateTransitionsHash.assertEquals(
      stateProof.publicOutput.stateTransitionsHash,
      "StateTransition list commitments are not equal"
    );

    appProof.verify();
    stateProof.verify();

    // Apply state if status success
    state.stateRoot.assertEquals(stateProof.publicInput.stateRoot, "fromStateRoot not matching");
    stateTo.stateRoot = Circuit.if(
      appProof.publicOutput.status,
      stateProof.publicOutput.stateRoot,
      stateProof.publicInput.stateRoot
    );

    // Append tx to transaction list
    const transactionList = new DefaultProvableHashList(Field, state.transactionsHash);

    const { transactionHash } = appProof.publicOutput;
    transactionList.push(transactionHash);

    stateTo.transactionsHash = transactionList.commitment;

    return stateTo;
  }

  // public proveTransaction(
  //   publicInput: BlockProverPublicInput,
  //   stateProof: Proof<StateTransitionProverPublicInput>,
  //   appProof: AppChainProof
  // ) {
  //
  //   const state: BlockProverState = {
  //     transactionHash: publicInput.fromTransactionsHash,
  //     stateRoot: publicInput.fromStateRoot
  //   };
  //
  //   this.applyTransaction(state, stateProof, appProof);
  //
  //   publicInput.toStateRoot.assertEquals(state.stateRoot, "toStateRoot not matching");
  //   publicInput.toTransactionsHash.assertEquals(state.transactionHash, "toTransactionsHash does not match with computed value");
  //
  // }

  public merge(
    publicInput: BlockProverState,
    proof1: SelfProof<BlockProverState, BlockProverState>,
    proof2: SelfProof<BlockProverState, BlockProverState>
  ) : BlockProverState {

    // Check state
    publicInput.stateRoot.assertEquals(proof1.publicInput.stateRoot, "StateRoot step 1");
    proof1.publicOutput.stateRoot.assertEquals(proof2.publicInput.stateRoot, "StateRoot step 2");

    // Check transaction list
    publicInput.transactionsHash.assertEquals(
      proof1.publicInput.transactionsHash,
      "ST commitment step 1"
    );
    proof1.publicOutput.transactionsHash.assertEquals(
      proof2.publicInput.transactionsHash,
      "ST commitment step 2"
    );

    return new BlockProverState({
      stateRoot: proof2.publicOutput.stateRoot,
      transactionsHash: proof2.publicOutput.transactionsHash
    })

  }

  private createZkProgram() {

    // let stateTransitionProver = this.stateTransitionProver.getZkProgram()
    //
    // class ZkProgramProof extends Proof<StateTransitionProverPublicInput> {
    //     static publicInputType = StateTransitionProverPublicInput;
    //     static tag = () => stateTransitionProver;
    // }

    const ZkProgramProof = this.stateTransitionProver.getProofType();

    function createProgram(instance: BlockProver) {

      return Experimental.ZkProgram({
        publicInput: BlockProverState,
        publicOutput: BlockProverState,

        methods: {
          proveTransaction: {
            privateInputs: [ZkProgramProof, AppChainProof],

            method(
              publicInput: BlockProverState,
              // TODO Does this work? It errors when using typeof ZkProgramProof
              stateProof: Proof<StateTransitionProverState, StateTransitionProverState>,
              appProof: AppChainProof
            ) : BlockProverState {

              return instance.applyTransaction(publicInput, stateProof, appProof);

            }
          },

          merge: {
            privateInputs: [SelfProof<BlockProverState, BlockProverState>, SelfProof<BlockProverState, BlockProverState>],

            method(
              publicInput: BlockProverState,
              proof1: SelfProof<BlockProverState, BlockProverState>,
              proof2: SelfProof<BlockProverState, BlockProverState>
            ) : BlockProverState {
              return instance.merge(publicInput, proof1, proof2);
            }
          }
        }
      });
    }

    createProgram(this)

  }

}