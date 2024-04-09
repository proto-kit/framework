import "reflect-metadata";
import { Bool, ZkProgram, Field, PrivateKey, Proof, UInt64 } from "o1js";

import {
  BlockProver,
  type BlockProverState,
} from "../src/prover/block/BlockProver";
import { NoOpStateTransitionWitnessProvider } from "../src/prover/statetransition/StateTransitionWitnessProvider";
import {
  StateTransitionProverPublicInput,
  StateTransitionProverPublicOutput,
} from "../src/prover/statetransition/StateTransitionProvable";
import { BlockProverPublicInput } from "../src/prover/block/BlockProvable";
import {
  AreProofsEnabled,
  PlainZkProgram,
  WithZkProgrammable,
  ZkProgrammable,
} from "@proto-kit/common";
import { UnsignedTransaction } from "@proto-kit/sequencer";
import { AccountStateHook } from "../src/hooks/AccountStateHook";
import { container } from "tsyringe";
import {
  DefaultProvableHashList,
  MethodPublicOutput,
  NetworkState,
  Protocol,
  ProtocolMethodExecutionContext,
  SignedTransaction,
  ProvableStateTransition,
  RuntimeTransaction,
  StateTransitionProver,
  AccountStateHook,
  ProvableBlockHook,
} from "../src";
import { createAndInitTestingProtocol } from "./TestingProtocol";

type BlockProverProofPair = [
  Proof<void, MethodPublicOutput>,
  Proof<StateTransitionProverPublicInput, StateTransitionProverPublicOutput>
];

class MockAppChain implements AreProofsEnabled {
  public areProofsEnabled: boolean = false;

  setProofsEnabled(areProofsEnabled: boolean): void {
    this.areProofsEnabled = areProofsEnabled;
  }
}

class RuntimeZkProgrammable extends ZkProgrammable<
  undefined,
  MethodPublicOutput
> {
  get appChain(): AreProofsEnabled | undefined {
    return new MockAppChain();
  }

  zkProgramFactory(): PlainZkProgram<undefined, MethodPublicOutput> {
    const program = ZkProgram({
      name: "blockProverProgram",
      publicOutput: MethodPublicOutput,
      methods: {},
    });

    return {
      compile: program.compile.bind(program),
      verify: program.verify.bind(program),
      analyzeMethods: program.analyzeMethods.bind(program),
      methods: {},
      Proof: ZkProgram.Proof(program),
      analyzeMethods: program.analyzeMethods,
    };
  }
}

describe("blockProver", () => {
  const networkState = new NetworkState({
    block: {
      height: UInt64.zero,
    },
    previous: {
      rootHash: Field(0),
    },
  });

  const protocol = createAndInitTestingProtocol();

  function generateTestProofs(
    fromStateRoot: Field,
    toStateRoot: Field,
    toProtocolRoot: Field,
    protocolHash: Field,
    tx: SignedTransaction,
    networkState: NetworkState
  ): BlockProverProofPair {
    const transactionHash = tx.transaction.hash();
    const sthash = Field(123);

    const appProof = new Proof<undefined, MethodPublicOutput>({
      publicInput: undefined,
      publicOutput: new MethodPublicOutput({
        transactionHash,
        stateTransitionsHash: sthash,
        status: Bool(true),
        networkStateHash: networkState.hash(),
        isMessage: Bool(false),
      }),

      proof: "",
      maxProofsVerified: 2,
    });

    const stProof = new Proof<
      StateTransitionProverPublicInput,
      StateTransitionProverPublicOutput
    >({
      publicInput: new StateTransitionProverPublicInput({
        stateTransitionsHash: Field(0),
        protocolTransitionsHash: Field(0),
        stateRoot: fromStateRoot,
        protocolStateRoot: fromStateRoot,
      }),
      publicOutput: new StateTransitionProverPublicOutput({
        stateTransitionsHash: sthash,
        protocolTransitionsHash: protocolHash,
        stateRoot: toStateRoot,
        protocolStateRoot: toProtocolRoot,
      }),

      proof: "",
      maxProofsVerified: 2,
    });

    return [appProof, stProof];
  }

  it("dummy", () => {
    expect(1).toBe(1);
  });

  // TODO
  // it("previously applied transaction should also pass with derived publicInputs", () => {
  //   expect.assertions(2);
  //
  //   const priv = PrivateKey.random();
  //
  //   const tx = new UnsignedTransaction({
  //     methodId: Field(0),
  //     args: [Field(0)],
  //     nonce: UInt64.zero,
  //     sender: priv.toPublicKey(),
  //   })
  //     .sign(priv)
  //     .toProtocolTransaction();
  //
  //   const executionData = {
  //     networkState,
  //     transaction: tx,
  //   };
  //
  //   // const asmodule = protocol.resolve()
  //
  //   protocol.dependencyContainer
  //     .resolveAll<ProvableBlockHook<unknown>>("ProvableBlockHook")
  //     .forEach((module) => {
  //       module.beforeBlock(executionData);
  //     });
  //
  //   const hashList = new DefaultProvableHashList(ProvableStateTransition);
  //
  //   container
  //     .resolve(ProtocolMethodExecutionContext)
  //     .current()
  //     .result.stateTransitions.map((x) => x.toProvable())
  //     .forEach((st) => {
  //       hashList.push(st);
  //     });
  //
  //   const blockProver = protocol.resolve("BlockProver");
  //
  //   const fromState = Field(1);
  //   const toState = Field(2);
  //
  //   const [appProof, stProof] = generateTestProofs(
  //     fromState,
  //     toState,
  //     hashList.commitment,
  //     tx,
  //     networkState
  //   );
  //
  //   const fromProverState: BlockProverState = {
  //     stateRoot: fromState,
  //     transactionsHash: Field(0),
  //     networkStateHash: networkState.hash(),
  //   };
  //
  //   const toProverState = blockProver.applyTransaction(
  //     fromProverState,
  //     stProof,
  //     appProof,
  //     executionData
  //   );
  //
  //   const publicInput = new BlockProverPublicInput({
  //     stateRoot: fromProverState.stateRoot,
  //     transactionsHash: fromProverState.transactionsHash,
  //     networkStateHash: networkState.hash(),
  //   });
  //
  //   const publicOutput = blockProver.proveTransaction(
  //     publicInput,
  //     stProof,
  //     appProof,
  //     { networkState, transaction: tx }
  //   );
  //
  //   expect(publicOutput.stateRoot).toStrictEqual(toProverState.stateRoot);
  //   expect(publicOutput.transactionsHash).toStrictEqual(
  //     toProverState.transactionsHash
  //   );
  // });
});
