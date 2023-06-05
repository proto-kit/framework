import {
  Circuit,
  Experimental,
  Field,
  type Proof,
  SelfProof,
  Struct,
} from "snarkyjs";
import { injectable } from "tsyringe";

import {
  StateTransitionProver,
  type StateTransitionProverPublicInput,
} from "../statetransition/StateTransitionProver.js";
import { DefaultProvableHashList } from "../../utils/ProvableHashList";
import { MethodPublicInput } from "../../model/MethodPublicInput";
import { Subclass } from "../../utils/utils";

const errors = {
  stateProofNotStartingAtZero: () => "StateProof not starting ST-commitment at zero",

  stateTransitionsHashNotEqual: () =>
    "StateTransition list commitments are not equal",

  propertyNotMatching: (propertyName: string) => `${propertyName} not matching`,

  stateRootNotMatching: (step: string) => `StateRoots not matching ${step}`,

  transactionsHashNotMatching: (step: string) =>
    `transactions hash not matching ${step}`,
}

export interface BlockProverState {
  // The current state root of the block prover
  stateRoot: Field;

  /**
   * The current commitment of the transaction-list which
   * will at the end equal the bundle hash
   */
  transactionsHash: Field;
}

export class BlockProverPublicInput extends Struct({
  fromTransactionsHash: Field,
  toTransactionsHash: Field,
  fromStateRoot: Field,
  toStateRoot: Field,
}) {}

/**
 * BlockProver class, which aggregates a AppChainProof and
 * a StateTransitionProof into a single BlockProof, that can
 * then be merged to be committed to the base-layer contract
 */
@injectable()
export class BlockProver {
  public constructor(
    private readonly stateTransitionProver: StateTransitionProver
  ) {}

  /**
   * Applies and checks the two proofs and applies the corresponding state
   * changes to the given state
   *
   * @param state The from-state of the BlockProver
   * @param stateTransitionProof
   * @param appProof
   * @returns The new BlockProver-state to be used as public output
   */
  public applyTransaction(
    state: BlockProverState,
    stateTransitionProof: Proof<StateTransitionProverPublicInput>,
    appProof: Proof<MethodPublicInput>
  ): BlockProverState {
    appProof.verify();
    stateTransitionProof.verify();

    const stateTo = { ...state };

    // Checks for the stateTransitionProof and appProof matching
    stateTransitionProof.publicInput.fromStateTransitionsHash.assertEquals(
      Field(0),
      errors.stateProofNotStartingAtZero()
    );

    appProof.publicInput.stateTransitionsHash.assertEquals(
      stateTransitionProof.publicInput.toStateTransitionsHash,
      errors.stateTransitionsHashNotEqual()
    );

    // Apply state if status success
    state.stateRoot.assertEquals(
      stateTransitionProof.publicInput.fromStateRoot,
      errors.propertyNotMatching("from state root")
    );
    stateTo.stateRoot = Circuit.if(
      appProof.publicInput.status,
      stateTransitionProof.publicInput.toStateRoot,
      stateTransitionProof.publicInput.fromStateRoot
    );

    // Append tx to transaction list
    const transactionList = new DefaultProvableHashList(
      Field,
      state.transactionsHash
    );

    const { transactionHash } = appProof.publicInput;
    transactionList.push(transactionHash);

    stateTo.transactionsHash = transactionList.commitment;

    return stateTo;
  }

  public proveTransaction(
    publicInput: BlockProverPublicInput,
    stateProof: Proof<StateTransitionProverPublicInput>,
    appProof: Proof<MethodPublicInput>
  ) {
    const state: BlockProverState = {
      transactionsHash: publicInput.fromTransactionsHash,
      stateRoot: publicInput.fromStateRoot,
    };

    this.applyTransaction(state, stateProof, appProof);

    publicInput.toStateRoot.assertEquals(
      state.stateRoot,
      errors.propertyNotMatching("to state root")
    );
    publicInput.toTransactionsHash.assertEquals(
      state.transactionsHash,
      errors.propertyNotMatching("to transactions hash and computed hash")
    );
  }

  public merge(
    publicInput: BlockProverPublicInput,
    proof1: SelfProof<BlockProverPublicInput>,
    proof2: SelfProof<BlockProverPublicInput>
  ) {
    proof1.verify();
    proof2.verify();

    // Check state
    publicInput.fromStateRoot.assertEquals(
      proof1.publicInput.fromStateRoot,
      errors.stateRootNotMatching("publicInput.from -> proof1.from")
    );
    proof1.publicInput.toStateRoot.assertEquals(
      proof2.publicInput.fromStateRoot,
      errors.stateRootNotMatching("proof1.to -> proof2.from")
    );
    proof2.publicInput.toStateRoot.assertEquals(
      publicInput.toStateRoot,
      errors.stateRootNotMatching("proof2.to -> publicInput.to")
    );

    // Check transaction list
    publicInput.fromTransactionsHash.assertEquals(
      proof1.publicInput.fromTransactionsHash,
      errors.transactionsHashNotMatching("publicInput.from -> proof1.from")
    );
    proof1.publicInput.toTransactionsHash.assertEquals(
      proof2.publicInput.fromTransactionsHash,
      errors.transactionsHashNotMatching("proof1.to -> proof2.from")
    );
    proof2.publicInput.toTransactionsHash.assertEquals(
      publicInput.fromTransactionsHash,
      errors.transactionsHashNotMatching("proof2.to -> publicInput.to")
    );
  }

  /**
   * Creates the BlockProver ZkProgram.
   * Recursive linking of proofs is done via the previously
   * injected StateTransitionProver and the required AppChainProof class
   */
  public createZkProgram(
    AppChainProof: Subclass<typeof Proof<MethodPublicInput>>
  ) {
    const ZkProgramProof = this.stateTransitionProver.getProofType();
    const proveTransaction = this.proveTransaction.bind(this);
    const merge = this.merge.bind(this);

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
            proveTransaction(publicInput, stateProof, appProof);
          },
        },

        merge: {
          privateInputs: [
            SelfProof<BlockProverPublicInput>,
            SelfProof<BlockProverPublicInput>,
          ],

          method(
            publicInput: BlockProverPublicInput,
            proof1: SelfProof<BlockProverPublicInput>,
            proof2: SelfProof<BlockProverPublicInput>
          ) {
            merge(publicInput, proof1, proof2);
          },
        },
      },
    });
  }
}
