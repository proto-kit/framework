/* eslint-disable max-classes-per-file */
import {
  Experimental,
  Field,
  Struct,
  Provable,
  FlexibleProvablePure,
  Proof,
} from "snarkyjs";
import { Memoize } from "typescript-memoize";

import {
  PlainZkProgram,
  ZkProgrammable,
} from "../../src/zkProgrammable/ZkProgrammable";

class TestPublicInput extends Struct({
  foo: Field,
}) {}

class TestPublicOutput extends Struct({
  bar: Field,
}) {}

class TestProgrammable extends ZkProgrammable<
  TestPublicInput,
  TestPublicOutput
> {
  public foo(publicInput: TestPublicInput, bar: Field) {
    // expose the private input as public output again for testing purposes
    return new TestPublicOutput({
      bar,
    });
  }

  public zkProgramFactory() {
    const program = Experimental.ZkProgram({
      publicInput: TestPublicInput,
      publicOutput: TestPublicOutput,

      methods: {
        foo: {
          privateInputs: [Field],
          method: this.foo.bind(this),
        },
      },
    });

    const SelfProof = Experimental.ZkProgram.Proof(program);

    const methods = {
      foo: program.foo.bind(program),
    };

    return {
      compile: program.compile.bind(program),
      verify: program.verify.bind(program),
      Proof: SelfProof,
      methods,
    };
  }
}

class EmptyPublicInput extends Struct({}) {}

class OtherTestProgrammable extends ZkProgrammable<EmptyPublicInput, void> {
  public constructor(public testProgrammable: TestProgrammable) {
    super();
  }

  public bar(
    publicInput: EmptyPublicInput,
    testProgrammableProof: Proof<TestPublicInput, TestPublicOutput>
  ) {
    testProgrammableProof.verify();
  }

  public zkProgramFactory(): PlainZkProgram<EmptyPublicInput, void> {
    const program = Experimental.ZkProgram({
      publicInput: EmptyPublicInput,
      publicOutput: undefined,

      methods: {
        bar: {
          privateInputs: [this.testProgrammable.zkProgram.Proof],
          method: this.bar.bind(this),
        },
      },
    });

    const methods = {
      bar: program.bar.bind(program),
    };

    const SelfProof = Experimental.ZkProgram.Proof(program);

    return {
      compile: program.compile.bind(program),
      verify: program.verify.bind(program),
      Proof: SelfProof,
      methods,
    };
  }
}

describe("zkProgrammable", () => {
  it("should create and cache a ZkProgram", async () => {
    expect.assertions(2);

    const testProgrammable = new TestProgrammable();
    const { zkProgram: testZkProgram } = testProgrammable;

    const testPublicInput = new TestPublicInput({
      foo: Field(0),
    });

    await testZkProgram.compile();

    const testProof = await testZkProgram.methods.foo(
      testPublicInput,
      Field(0)
    );

    expect(testProof.publicOutput.bar.toString()).toBe(
      testPublicInput.foo.toString()
    );

    const { zkProgram: otherTestZkProgram } = new OtherTestProgrammable(
      testProgrammable
    );
    const otherTestPublicInput = new EmptyPublicInput({});

    await otherTestZkProgram.compile();

    const otherTestProof = await otherTestZkProgram.methods.bar(
      otherTestPublicInput,
      testProof
    );

    const verified = await otherTestZkProgram.verify(otherTestProof);

    expect(verified).toBe(true);
  }, 500_000);
});
