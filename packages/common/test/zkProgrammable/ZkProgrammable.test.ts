import "reflect-metadata";
import { jest } from "@jest/globals";
import { container } from "tsyringe";
import { Field, Struct, Proof, ZkProgram } from "o1js";

import {
  MOCK_PROOF,
  provableMethod,
} from "../../src/zkProgrammable/provableMethod";
import {
  AreProofsEnabled,
  CompileArtifact,
  MOCK_VERIFICATION_KEY,
  PlainZkProgram,
  ZkProgrammable,
} from "../../src/zkProgrammable/ZkProgrammable";
import { ProvableMethodExecutionContext } from "../../src/zkProgrammable/ProvableMethodExecutionContext";

const appChainMock: AreProofsEnabled = {
  areProofsEnabled: false,

  setProofsEnabled(areProofsEnabled: boolean) {
    this.areProofsEnabled = areProofsEnabled;
  },
};

class TestPublicInput extends Struct({
  foo: Field,
}) {}

class TestPublicOutput extends Struct({
  bar: Field,
}) {}

const failErrorMessage = "test failure";

type Balance = Field;

class TestProgrammable extends ZkProgrammable<
  TestPublicInput,
  TestPublicOutput
> {
  public appChain: AreProofsEnabled = appChainMock;

  @provableMethod()
  public async foo(publicInput: TestPublicInput, bar: Balance) {
    // expose the private input as public output again for testing purposes
    return new TestPublicOutput({
      bar,
    });
  }

  @provableMethod()
  public async fail(publicInput: TestPublicInput) {
    publicInput.foo.assertEquals(1, failErrorMessage);

    return new TestPublicOutput({
      bar: Field(0),
    });
  }

  public zkProgramFactory() {
    const program = ZkProgram({
      name: "testprogram",
      publicInput: TestPublicInput,
      publicOutput: TestPublicOutput,

      methods: {
        foo: {
          privateInputs: [Field],
          method: this.foo.bind(this),
        },

        fail: {
          privateInputs: [],
          method: this.fail.bind(this),
        },
      },
    });

    const SelfProof = ZkProgram.Proof(program);

    const methods = {
      foo: program.foo.bind(program),
      fail: program.fail.bind(program),
    };

    return {
      compile: program.compile.bind(program),
      verify: program.verify.bind(program),
      analyzeMethods: program.analyzeMethods.bind(program),
      Proof: SelfProof,
      methods,
    };
  }
}

class OtherTestProgrammable extends ZkProgrammable {
  public appChain: AreProofsEnabled = appChainMock;

  public constructor(public testProgrammable: TestProgrammable) {
    super();
  }

  @provableMethod()
  public async bar(
    testProgrammableProof: InstanceType<
      typeof this.testProgrammable.zkProgram.Proof
    >
  ) {
    testProgrammableProof.verify();
  }

  public zkProgramFactory(): PlainZkProgram {
    const program = ZkProgram({
      name: "testprogram2",
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

    const SelfProof = ZkProgram.Proof(program);

    return {
      compile: program.compile.bind(program),
      verify: program.verify.bind(program),
      analyzeMethods: program.analyzeMethods.bind(program),
      Proof: SelfProof,
      methods,
    };
  }
}

const testWithProofs = false;

describe("zkProgrammable", () => {
  let testProgrammable: TestProgrammable;
  let artifact: CompileArtifact;
  let zkProgramFactorySpy: ReturnType<typeof jest.spyOn>;

  const testCases: [
    boolean,
    {
      verificationKey: CompileArtifact["verificationKey"];
      shouldVerifyMockProofs: boolean;
    },
  ][] = [
    [
      false,
      {
        verificationKey: MOCK_VERIFICATION_KEY,
        shouldVerifyMockProofs: true,
      },
    ],
  ];

  // We want to disable testing with proofs enabled for the CI and other stuff,
  // as it is quite expensive. But we should find a better pattern than this
  if (testWithProofs) {
    // TODO Migrate to new o1js compile artifact format
    // testCases.push([
    //   true,
    //   {
    //     verificationKey:
    // eslint-disable-next-line max-len
    //       "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",
    //
    //     shouldVerifyMockProofs: false,
    //   },
    // ]);
  }

  describe.each(testCases)(
    "areProofsEnabled",
    (areProofsEnabled, { verificationKey, shouldVerifyMockProofs }) => {
      beforeAll(async () => {
        testProgrammable = new TestProgrammable();
        testProgrammable.appChain.setProofsEnabled(areProofsEnabled);
        zkProgramFactorySpy = jest.spyOn(testProgrammable, "zkProgramFactory");
        artifact = await testProgrammable.zkProgram.compile();
      }, 500_000);

      describe("zkProgramFactory", () => {
        it("should create and cache a ZkProgram", () => {
          expect.assertions(1);

          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const programs = {
            1: testProgrammable.zkProgram,
            2: testProgrammable.zkProgram,
            3: testProgrammable.zkProgram,
          };

          expect(zkProgramFactorySpy).toHaveBeenCalledTimes(1);
        });
      });

      it("compile should return the correct verification key", () => {
        expect.assertions(1);

        expect(artifact.verificationKey).toBe(verificationKey);
      });

      it("if proofs are disabled, it should successfully verify mock proofs", async () => {
        expect.assertions(1);

        const proof = new testProgrammable.zkProgram.Proof({
          proof: MOCK_PROOF,

          publicInput: new TestPublicInput({
            foo: Field(0),
          }),

          publicOutput: new TestPublicOutput({
            bar: Field(0),
          }),

          maxProofsVerified: 0,
        });

        const verified = await testProgrammable.zkProgram.verify(proof);

        expect(verified).toBe(shouldVerifyMockProofs);

        // Check if toJSON works on mockproofs
        // const json = proof.toJSON();
        // expect(json).toBeDefined();
      });

      describe("provableMethod", () => {
        const executionContext =
          container.resolve<ProvableMethodExecutionContext>(
            ProvableMethodExecutionContext
          );

        let otherTestProgrammable: OtherTestProgrammable;

        const testPublicInput = new TestPublicInput({
          foo: Field(0),
        });

        describe("zkProgram interoperability", () => {
          beforeAll(async () => {
            otherTestProgrammable = new OtherTestProgrammable(testProgrammable);
            await otherTestProgrammable.zkProgram.compile();
          }, 500_000);

          it("should successfully pass proof of one zkProgram as input to another zkProgram", async () => {
            expect.assertions(3);

            // execute foo
            await testProgrammable.foo(testPublicInput, Field(0));

            // prove foo
            const testProof = await executionContext
              .current()
              .result.prove<Proof<TestPublicInput, TestPublicOutput>>();
            const testProofVerified =
              await testProgrammable.zkProgram.verify(testProof);

            // execute bar
            await otherTestProgrammable.bar(testProof);

            // proof bar
            const otherTestProof = await executionContext
              .current()
              .result.prove<Proof<undefined, void>>();
            const otherTestProofVerified =
              await otherTestProgrammable.zkProgram.verify(otherTestProof);

            expect(testProof.publicOutput.bar.toString()).toBe(
              testPublicInput.foo.toString()
            );

            expect(testProofVerified).toBe(true);
            expect(otherTestProofVerified).toBe(true);
          }, 500_000);
        });

        describe("failed method execution", () => {
          it("if the method fails, it should fail to execute and prove", async () => {
            expect.assertions(2);

            await expect(
              testProgrammable.fail(testPublicInput)
            ).rejects.toThrow(failErrorMessage);

            await expect(async () => {
              await executionContext.current().result.prove();
            }).rejects.toThrow(failErrorMessage);
          });
        });
      });
    }
  );
});
