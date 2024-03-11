/* eslint-disable max-statements */
// eslint-disable-next-line max-classes-per-file
import "reflect-metadata";
import {
  PrivateKey,
  UInt64,
  Provable,
  Field,
  Struct,
  Signature,
  MerkleMap,
  MerkleMapWitness,
  Experimental,
} from "o1js";
import {
  runtimeMethod,
  RuntimeModule,
  runtimeModule,
  state,
} from "@proto-kit/module";
import { TestingAppChain } from "../src/index";
import { log } from "@proto-kit/common";
import { assert, State, StateMap } from "@proto-kit/protocol";
import { dummyBase64Proof } from "o1js/dist/node/lib/proof_system";

import { Pickles } from "o1js/dist/node/snarky";

class TestStruct extends Struct({
  foo: Field,
  bar: Provable.Array(Field, 2),
}) {}

const BALLOT_LENGTH = 10;
class Ballot extends Struct({
  ballot: Provable.Array(UInt64, BALLOT_LENGTH),
}) {
  public static empty(): Ballot {
    const ballot = Array(10).fill(UInt64.from(0));
    return new Ballot({ ballot });
  }
}

const map = new MerkleMap();
const witness = map.getWitness(Field(0));

function foo(publicInput: Field) {
  return Field(0);
}
const program = Experimental.ZkProgram({
  publicOutput: Field,
  publicInput: Field,

  methods: {
    foo: {
      privateInputs: [],
      // eslint-disable-next-line putout/putout
      method: foo,
    },
  },
});

class ProgramProof extends Experimental.ZkProgram.Proof(program) {}

const [, dummy] = Pickles.proofOfBase64(await dummyBase64Proof(), 2);
const proof = new ProgramProof({
  proof: dummy,
  publicOutput: Field(0),
  publicInput: Field(0),
  maxProofsVerified: 2,
});

@runtimeModule()
class TestRuntime extends RuntimeModule<unknown> {
  @state() public test1 = State.from(Field);

  @state() public ballots = StateMap.from(Field, Ballot);

  @runtimeMethod()
  public test(
    field: Field,
    uInt64: UInt64,
    struct: TestStruct,
    signature: Signature,
    ballot: Ballot,
    witness: MerkleMapWitness,
    proof: ProgramProof
  ) {
    const valid = signature.verify(
      this.transaction.sender.value,
      TestStruct.toFields(struct)
    );
    assert(valid, "Signature invalid");
    this.test1.set(field);
    this.ballots.get(Field(1));
    this.ballots.set(Field(1), ballot);

    const [root, key] = witness.computeRootAndKey(Field(0));
    const knownRoot = Provable.witness(Field, () => map.getRoot());
    assert(root.equals(knownRoot), "Root missmatch");
    assert(key.equals(Field(0)), "Key missmatch");

    proof.verify();
  }
}

describe("parameters", () => {
  it("should accept various provable transaction arguments", async () => {
    expect.assertions(1);

    const signer = PrivateKey.random();
    const sender = signer.toPublicKey();

    /**
     * Setup the app chain for testing purposes,
     * using the provided runtime modules
     */
    const appChain = TestingAppChain.fromRuntime({
      modules: { TestRuntime },
    });

    appChain.configurePartial({
      Runtime: {
        TestRuntime: {},
      },
    });

    await appChain.start();

    appChain.setSigner(signer);

    const runtime = appChain.runtime.resolve("TestRuntime");
    const struct = new TestStruct({
      foo: Field(1),
      bar: [Field(1), Field(1)],
    });

    const signature = Signature.create(signer, TestStruct.toFields(struct));
    const transaction = await appChain.transaction(sender, () => {
      runtime.test(
        Field(0),
        UInt64.from(0),
        struct,
        signature,
        Ballot.empty(),
        witness,
        proof
      );
    });

    await transaction.sign();
    await transaction.send();

    const block = await appChain.produceBlock();

    expect(block?.transactions[0].status.toBoolean()).toBe(true);
  }, 60_000);
});
