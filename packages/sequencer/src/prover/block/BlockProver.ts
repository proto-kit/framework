import { Circuit, Experimental, Field, type Proof, SelfProof, Struct } from "snarkyjs";
import { injectable } from "tsyringe";
import { StateTransitionProver, type StateTransitionProverPublicInput } from "../statetransition/StateTransitionProver.js";
import { DefaultProvableMerkleList } from "../utils/ProvableMerkleList.js";
import { AppChainProof } from "./AppChainProof.js";

export type BlockProverState = {
  stateRoot: Field;
  transactionHash: Field;
};

export class BlockProverPublicInput extends Struct({
  fromTransactionsHash: Field, // TODO name it BundleHash?
  toTransactionsHash: Field,
  fromStateRoot: Field,
  toStateRoot: Field,
}) {}

@injectable()
export class BlockProver {

  private readonly stateTransitionProver: StateTransitionProver;

  public constructor(stateTransitionProver: StateTransitionProver) {
    this.stateTransitionProver = stateTransitionProver;
  }

  public applyTransaction(
    state: BlockProverState,
    stateProof: Proof<StateTransitionProverPublicInput>,
    appProof: AppChainProof
  ): BlockProverState {

    const stateTo = { ...state }

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
    stateTo.stateRoot = Circuit.if(
      appProof.publicInput.status,
      stateProof.publicInput.toStateRoot,
      stateProof.publicInput.fromStateRoot
    );

    // Append tx to transaction list
    const transactionList = new DefaultProvableMerkleList(state.transactionHash);

    const { transactionHash } = appProof.publicInput;
    transactionList.push(transactionHash);

    stateTo.transactionHash = transactionList.commitment;

    return stateTo;
  }

  public proveTransaction(
    publicInput: BlockProverPublicInput,
    stateProof: Proof<StateTransitionProverPublicInput>,
    appProof: AppChainProof
  ) {

    const state: BlockProverState = {
      transactionHash: publicInput.fromTransactionsHash,
      stateRoot: publicInput.fromStateRoot
    };

    this.applyTransaction(state, stateProof, appProof);

    publicInput.toStateRoot.assertEquals(state.stateRoot, "toStateRoot not matching");
    publicInput.toTransactionsHash.assertEquals(state.transactionHash, "toTransactionsHash does not match with computed value");

  }

  public merge(
    publicInput: BlockProverPublicInput,
    proof1: SelfProof<BlockProverPublicInput>,
    proof2: SelfProof<BlockProverPublicInput>
  ) {

    // Check state
    publicInput.fromStateRoot.assertEquals(proof1.publicInput.fromStateRoot, "StateRoot step 1");
    proof1.publicInput.toStateRoot.assertEquals(proof2.publicInput.fromStateRoot, "StateRoot step 2");
    proof2.publicInput.toStateRoot.assertEquals(publicInput.toStateRoot, "StateRoot step 3");

    // Check transaction list
    publicInput.fromTransactionsHash.assertEquals(
      proof1.publicInput.fromTransactionsHash,
      "ST commitment step 1"
    );
    proof1.publicInput.toTransactionsHash.assertEquals(
      proof2.publicInput.fromTransactionsHash,
      "ST commitment step 2"
    );
    proof2.publicInput.toTransactionsHash.assertEquals(
      publicInput.fromTransactionsHash,
      "ST commitment step 3"
    );

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
        publicInput: BlockProverPublicInput,

        methods: {
          proveTransaction: {
            privateInputs: [ZkProgramProof, AppChainProof],

            method(
              publicInput: BlockProverPublicInput,
              // TODO Does this work? It errors when using typeof ZkProgramProof
              stateProof: Proof<StateTransitionProverPublicInput>,
              appProof: AppChainProof
            ) {

              instance.proveTransaction(publicInput, stateProof, appProof);

            }
          },

          merge: {
            privateInputs: [SelfProof<BlockProverPublicInput>, SelfProof<BlockProverPublicInput>],

            method(
              publicInput: BlockProverPublicInput,
              proof1: SelfProof<BlockProverPublicInput>,
              proof2: SelfProof<BlockProverPublicInput>
            ) {
              instance.merge(publicInput, proof1, proof2);
            }
          }
        }
      });
    }

    createProgram(this)

  }

}