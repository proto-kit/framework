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
  PublicKey,
  ZkProgram,
} from "o1js";
import {
  runtimeMethod,
  RuntimeModule,
  runtimeModule,
  state,
} from "@proto-kit/module";
import { assert, State, StateMap } from "@proto-kit/protocol";
import { expectDefined } from "@proto-kit/common";

import { TestingAppChain } from "../src/index";

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

async function foo(publicInput: Field) {
  return Field(0);
}
const program = ZkProgram({
  name: "parametersTestProgram",
  publicOutput: Field,
  publicInput: Field,

  methods: {
    foo: {
      privateInputs: [],
      method: foo,
    },
  },
});

class ProgramProof extends ZkProgram.Proof(program) {}

const proof = await ProgramProof.dummy(Field(0), Field(0), 2);

@runtimeModule()
class TestRuntime extends RuntimeModule<unknown> {
  @state() public test1 = State.from(Field);

  @state() public ballots = StateMap.from(Field, Ballot);

  @runtimeMethod()
  public async test(
    field: Field,
    uInt64: UInt64,
    struct: TestStruct,
    signature: Signature,
    ballot: Ballot,
    // eslint-disable-next-line @typescript-eslint/no-shadow
    witness: MerkleMapWitness,
    // eslint-disable-next-line @typescript-eslint/no-shadow
    proof: ProgramProof,
    address: PublicKey
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

    Provable.log("address", address);
  }
}

describe("parameters", () => {
  it("should accept various provable transaction arguments", async () => {
    expect.assertions(2);

    const signer = PrivateKey.random();
    const sender = signer.toPublicKey();

    /**
     * Setup the app chain for testing purposes,
     * using the provided runtime modules
     */
    const appChain = TestingAppChain.fromRuntime({
      TestRuntime,
    });

    appChain.configurePartial({
      Runtime: {
        TestRuntime: {},
        Balances: {},
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
    const transaction = await appChain.transaction(sender, async () => {
      await runtime.test(
        Field(0),
        UInt64.from(0),
        struct,
        signature,
        Ballot.empty(),
        witness,
        proof,
        PrivateKey.random().toPublicKey()
      );
    });

    await transaction.sign();
    await transaction.send();

    const block = await appChain.produceBlock();

    expectDefined(block);
    expect(block.transactions[0].status.toBoolean()).toBe(true);
  }, 60_000);
});
