import {
  Struct,
  Field,
  Bool,
  PublicKey,
  PrivateKey,
  ZkProgram,
  Proof,
} from "o1js";
import { NonMethods, noop } from "@proto-kit/common";

import {
  MethodParameterEncoder,
  RuntimeModule,
  runtimeModule,
  runtimeMethod,
} from "../../src";

class TestStruct extends Struct({
  a: Field,
  b: Bool,
}) {}

const TestProgram = ZkProgram({
  name: "TestProgram",
  publicInput: PublicKey,
  publicOutput: TestStruct,
  methods: {
    foo: {
      privateInputs: [],
      method: async (input: PublicKey) => {
        return {
          a: Field(input.x),
          b: Bool(input.isOdd),
        };
      },
    },
  },
});
class TestProof extends ZkProgram.Proof(TestProgram) {}

describe("MethodParameterEncoder", () => {
  it("should en/decode Structs correctly", async () => {
    expect.assertions(7);

    const encoder = new MethodParameterEncoder([TestStruct]);
    const { fields, auxiliary } = encoder.encode([
      { a: Field(2), b: Bool(true) },
    ]);

    expect(auxiliary).toHaveLength(0);
    expect(fields).toHaveLength(2);
    expect(fields[0].toString()).toBe("2");
    expect(fields[1].toString()).toStrictEqual(Bool(true).toField().toString());

    const decoded = await encoder.decode(fields, auxiliary);
    expect(decoded).toHaveLength(1);
    const decoded1 = decoded[0] as unknown as NonMethods<TestStruct>;
    expect(decoded1.a.toString()).toStrictEqual("2");
    expect(decoded1.b.toString()).toStrictEqual("true");
  });

  it("should en/decode CircuitValues correctly", async () => {
    expect.assertions(6);

    const encoder = new MethodParameterEncoder([PublicKey]);
    const pk = PrivateKey.random().toPublicKey();

    const { fields, auxiliary } = encoder.encode([pk]);

    expect(auxiliary).toHaveLength(0);
    expect(fields).toHaveLength(2);
    expect(fields.map((x) => x.toString())).toStrictEqual(
      pk.toFields().map((x) => x.toString())
    );

    const decoded = await encoder.decode(fields, auxiliary);
    expect(decoded).toHaveLength(1);

    const decoded1 = decoded[0] as unknown as PublicKey;
    expect(decoded1.x.toString()).toStrictEqual(pk.x.toString());
    expect(decoded1.isOdd.toString()).toStrictEqual(pk.isOdd.toString());
  });

  it("should en/decode Proofs correctly", async () => {
    expect.assertions(13);

    const encoder = new MethodParameterEncoder([TestProof]);
    const input = PrivateKey.random().toPublicKey();
    const output = { a: input.x, b: input.isOdd };
    const dummy = await TestProof.dummy(input, output, 0);

    const { fields, auxiliary } = encoder.encode([dummy]);

    expect(auxiliary).toHaveLength(1);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const json = JSON.parse(auxiliary[0]);

    expect(json).toHaveProperty("maxProofsVerified");
    expect(json).toHaveProperty("proof");
    expect(json.maxProofsVerified).toStrictEqual(0);
    expect(json.proof.length).toBeGreaterThan(20);

    expect(fields).toHaveLength(4);
    expect(fields.map((x) => x.toString())).toStrictEqual(
      [...input.toFields(), ...TestStruct.toFields(output)].map((x) =>
        x.toString()
      )
    );

    const decoded = await encoder.decode(fields, auxiliary);
    expect(decoded).toHaveLength(1);

    const decoded1 = decoded[0] as unknown as Proof<PublicKey, TestStruct>;
    expect(decoded1.maxProofsVerified).toStrictEqual(0);
    expect(decoded1.proof).toBeDefined();
    expect(decoded1.publicInput.equals(input).toBoolean()).toStrictEqual(true);
    expect(decoded1.publicOutput.a.equals(output.a).toBoolean()).toStrictEqual(
      true
    );
    expect(decoded1.publicOutput.b.equals(output.b).toBoolean()).toStrictEqual(
      true
    );
  }, 30000);
});

class TieredStruct extends TestStruct {}

@runtimeModule()
class TestModule extends RuntimeModule {
  @runtimeMethod()
  public async foo(
    a: TieredStruct,
    b: PublicKey,
    c: Field,
    d: TestProof,
    e: string
  ) {
    noop();
  }
}

describe("MethodParameterEncoder construction", () => {
  it("should throw on non-provable method signature", () => {
    const module = new TestModule();
    module.name = "testModule";
    expect(() => MethodParameterEncoder.fromMethod(module, "foo")).toThrowError(
      "'testModule.foo' are provable types or proofs (indizes: [4])"
    );
  });
});
