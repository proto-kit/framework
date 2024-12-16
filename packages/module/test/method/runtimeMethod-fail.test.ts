import { Bool, Field, PublicKey, Struct, ZkProgram } from "o1js";
import { noop } from "@proto-kit/common";

import { runtimeMethod, RuntimeModule, runtimeModule } from "../../src";

class TestStruct extends Struct({
  a: Field,
  b: Bool,
}) {}
class TieredStruct extends TestStruct {}
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

describe("Creating module with non-provable method argument", () => {
  it("should throw on non-provable method signature", () => {
    expect(() => {
      @runtimeModule()
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    }).toThrow(
      "Not all arguments of method 'undefined.foo' are provable types or proofs (indizes: [3, 4])"
    );
  });
});
