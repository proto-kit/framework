/* eslint-disable max-statements */
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
} from "snarkyjs";
import {
  runtimeMethod,
  RuntimeModule,
  runtimeModule,
  state,
} from "@proto-kit/module";
import { TestingAppChain } from "../../src/index";
import { log } from "@proto-kit/common";
import { assert, State, StateMap } from "@proto-kit/protocol";
import { Test } from "snarkyjs/dist/node/snarky";

log.setLevel("ERROR");

class TestStruct extends Struct({
  foo: Field,
  bar: Provable.Array(Field, 2),
}) {}

const BALLOT_LENGTH = 10;
class Ballot extends Struct({
  ballot: Provable.Array(UInt64, BALLOT_LENGTH),
}) {
  public static empty(): Ballot {
    const ballot = new Array(10).fill(UInt64.from(0));
    return new Ballot({ ballot });
  }
}

const map = new MerkleMap();
const witness = map.getWitness(Field(0));

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
    witness: MerkleMapWitness
  ) {
    const valid = signature.verify(
      this.transaction.sender,
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
  }
}

describe("testing app chain", () => {
  it("should enable a complete transaction roundtrip", async () => {
    expect.assertions(1);

    const signer = PrivateKey.random();
    const sender = signer.toPublicKey();

    /**
     * Setup the app chain for testing purposes,
     * using the provided runtime modules
     */
    const appChain = TestingAppChain.fromRuntime({
      modules: { TestRuntime },

      config: {
        TestRuntime: {},
      },
    });

    appChain.setSigner(signer);

    await appChain.start();

    const runtime = appChain.runtime.resolve("TestRuntime");
    const struct = new TestStruct({
      foo: Field(1),
      bar: [Field(1), Field(1)],
    });

    const signature = Signature.create(signer, TestStruct.toFields(struct));
    const transaction = appChain.transaction(sender, () => {
      runtime.test(
        Field(0),
        UInt64.from(0),
        struct,
        signature,
        Ballot.empty(),
        witness
      );
    });

    await transaction.sign();
    await transaction.send();

    const block = await appChain.produceBlock();

    expect(block?.txs[0].status).toBe(true);
  }, 60_000);
});
