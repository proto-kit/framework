import "reflect-metadata";
import { Bool, Experimental, Field, PrivateKey, Proof, UInt64 } from "o1js";

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
import ZkProgram = Experimental.ZkProgram;
import { UnsignedTransaction } from "@proto-kit/sequencer";
import { AccountStateHook } from "../src/blockmodules/AccountStateHook";
import { container } from "tsyringe";
import {
  BlockModule,
  DefaultProvableHashList,
  MethodPublicOutput,
  NetworkState,
  Protocol,
  ProtocolMethodExecutionContext,
  ProtocolTransaction,
  ProvableStateTransition,
  RuntimeTransaction,
  StateTransitionProver,
} from "../src";

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
    const program = Experimental.ZkProgram({
      publicOutput: MethodPublicOutput,
      methods: {},
    });

    return {
      compile: program.compile,
      verify: program.verify,
      methods: {},
      Proof: ZkProgram.Proof(program),
    };
  }
}

class RuntimeMock implements WithZkProgrammable<undefined, MethodPublicOutput> {
  zkProgrammable: ZkProgrammable<undefined, MethodPublicOutput> =
    new RuntimeZkProgrammable();
}

describe("blockProver", () => {
  const networkState = new NetworkState({
    block: {
      height: UInt64.zero,
    },
  });

  const protocol = Protocol.from({
    modules: {
      StateTransitionProver: StateTransitionProver,
      BlockProver: BlockProver,
    },
    blockModules: [AccountStateHook],
  });

  beforeEach(() => {
    protocol.registerValue({
      StateTransitionWitnessProvider: new NoOpStateTransitionWitnessProvider(),
      Runtime: new RuntimeMock(),
    });
  });

  function generateTestProofs(
    fromStateRoot: Field,
    toStateRoot: Field,
    protocolHash: Field,
    tx: ProtocolTransaction,
    networkState: NetworkState
  ): BlockProverProofPair {
    const transactionHash =
      RuntimeTransaction.fromProtocolTransaction(tx).hash();
    const sthash = Field(123);

    const appProof = new Proof<undefined, MethodPublicOutput>({
      publicInput: undefined,
      publicOutput: new MethodPublicOutput({
        transactionHash,
        stateTransitionsHash: sthash,
        status: Bool(true),
        networkStateHash: networkState.hash(),
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
      }),
      publicOutput: new StateTransitionProverPublicOutput({
        stateTransitionsHash: sthash,
        protocolTransitionsHash: protocolHash,
        stateRoot: toStateRoot,
      }),

      proof: "",
      maxProofsVerified: 2,
    });

    return [appProof, stProof];
  }

  it("previously applied transaction should also pass with derived publicInputs", () => {
    expect.assertions(2);

    const priv = PrivateKey.random();

    const tx = new UnsignedTransaction({
      methodId: Field(0),
      args: [Field(0)],
      nonce: UInt64.zero,
      sender: priv.toPublicKey(),
    })
      .sign(priv)
      .toProtocolTransaction();

    const executionData = {
      networkState,
      transaction: tx,
    };

    // const asmodule = protocol.resolve()

    protocol.dependencyContainer
      .resolveAll<BlockModule>("BlockModule")
      .forEach((module) => {
        module.createTransitions(executionData);
      });

    const hashList = new DefaultProvableHashList(ProvableStateTransition);

    container
      .resolve(ProtocolMethodExecutionContext)
      .current()
      .result.stateTransitions.map((x) => x.toProvable())
      .forEach((st) => {
        hashList.push(st);
      });

    const blockProver = protocol.resolve("BlockProver");

    const fromState = Field(1);
    const toState = Field(2);

    const [appProof, stProof] = generateTestProofs(
      fromState,
      toState,
      hashList.commitment,
      tx,
      networkState
    );

    const fromProverState: BlockProverState = {
      stateRoot: fromState,
      transactionsHash: Field(0),
      networkStateHash: networkState.hash(),
    };

    const toProverState = blockProver.applyTransaction(
      fromProverState,
      stProof,
      appProof,
      executionData
    );

    const publicInput = new BlockProverPublicInput({
      stateRoot: fromProverState.stateRoot,
      transactionsHash: fromProverState.transactionsHash,
      networkStateHash: networkState.hash(),
    });

    const publicOutput = blockProver.proveTransaction(
      publicInput,
      stProof,
      appProof,
      { networkState, transaction: tx }
    );

    expect(publicOutput.stateRoot).toStrictEqual(toProverState.stateRoot);
    expect(publicOutput.transactionsHash).toStrictEqual(
      toProverState.transactionsHash
    );
  });
});
