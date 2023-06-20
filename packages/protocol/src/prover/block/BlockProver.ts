import { Experimental, Field, type Proof, Provable, SelfProof } from "snarkyjs";
import { injectable } from "tsyringe";
import { AreProofsEnabled, PlainZkProgram, provableMethod, ZkProgrammable } from "@yab/common";

import { DefaultProvableHashList } from "../../utils/ProvableHashList";
import { MethodPublicOutput } from "../../model/MethodPublicOutput";
import { ProtocolModule } from "../../protocol/ProtocolModule";
import {
  StateTransitionProof,
  StateTransitionProverPublicInput,
  StateTransitionProverPublicOutput,
} from "../statetransition/StateTransitionProvable";

import {
  BlockProvable,
  BlockProverProof,
  BlockProverPublicInput,
  BlockProverPublicOutput,
} from "./BlockProvable";

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
}

/**
 * BlockProver class, which aggregates a AppChainProof and
 * a StateTransitionProof into a single BlockProof, that can
 * then be merged to be committed to the base-layer contract
 */
@injectable()
export class BlockProver
  extends ProtocolModule<BlockProverPublicInput, BlockProverPublicInput>
  implements BlockProvable
{
  public appChain?: AreProofsEnabled;

  public constructor(
    private readonly stateTransitionProver: ZkProgrammable<
      StateTransitionProverPublicInput,
      StateTransitionProverPublicOutput
    >,
    private readonly runtime: ZkProgrammable<void, MethodPublicOutput>
  ) {
    super();
  }

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
    stateTransitionProof: Proof<
      StateTransitionProverPublicInput,
      StateTransitionProverPublicOutput
    >,
    appProof: Proof<void, MethodPublicOutput>
  ): BlockProverState {
    appProof.verify();
    stateTransitionProof.verify();

    const stateTo = { ...state };

    // eslint-disable-next-line no-warning-comments
    // TODO Check the user authorization and methodId?

    // Checks for the stateTransitionProof and appProof matching
    stateTransitionProof.publicInput.stateTransitionsHash.assertEquals(
      Field(0),
      errors.stateProofNotStartingAtZero()
    );

    appProof.publicOutput.stateTransitionsHash.assertEquals(
      stateTransitionProof.publicOutput.stateTransitionsHash,
      errors.stateTransitionsHashNotEqual()
    );

    // Apply state if status success
    state.stateRoot.assertEquals(
      stateTransitionProof.publicInput.stateRoot,
      errors.propertyNotMatching("from state root")
    );
    stateTo.stateRoot = Provable.if(
      appProof.publicOutput.status,
      stateTransitionProof.publicOutput.stateRoot,
      stateTransitionProof.publicInput.stateRoot
    );

    // Append tx to transaction list
    const transactionList = new DefaultProvableHashList(
      Field,
      state.transactionsHash
    );

    const { transactionHash } = appProof.publicOutput;
    transactionList.push(transactionHash);

    stateTo.transactionsHash = transactionList.commitment;

    return stateTo;
  }

  @provableMethod()
  public proveTransaction(
    publicInput: BlockProverPublicInput,
    stateProof: StateTransitionProof,
    appProof: Proof<void, MethodPublicOutput>
  ): BlockProverPublicOutput {
    const state: BlockProverState = {
      transactionsHash: publicInput.transactionsHash,
      stateRoot: publicInput.stateRoot,
    };

    this.applyTransaction(state, stateProof, appProof);

    return new BlockProverPublicOutput({
      stateRoot: state.stateRoot,
      transactionsHash: state.transactionsHash,
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

    return new BlockProverPublicOutput({
      stateRoot: proof2.publicOutput.stateRoot,
      transactionsHash: proof2.publicOutput.transactionsHash,
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
    const StateTransitionProofClass =
      this.stateTransitionProver.zkProgram.Proof;
    const RuntimeProofClass = this.runtime.zkProgram.Proof;

    const proveTransaction = this.proveTransaction.bind(this);
    const merge = this.merge.bind(this);

    const program = Experimental.ZkProgram({
      publicInput: BlockProverPublicInput,
      publicOutput: BlockProverPublicOutput,

      methods: {
        proveTransaction: {
          privateInputs: [StateTransitionProofClass, RuntimeProofClass],

          method(
            publicInput: BlockProverPublicInput,
            stateProof: StateTransitionProof,
            appProof: Proof<void, MethodPublicOutput>
          ) {
            return proveTransaction(publicInput, stateProof, appProof);
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