import { Field, VerificationKey } from "o1js";

import { CompileRegistry, InferDependencyArtifacts } from "../../src";
/* eslint-disable @typescript-eslint/no-unused-vars */

type TestModule = {
  compile(
    registry: CompileRegistry
  ): Promise<{ bar: { verificationKey: VerificationKey } }>;
};

type Inferred = InferDependencyArtifacts<{ foo: TestModule }>;
const typeAssignmentTest: Inferred = {
  foo: {
    bar: {
      verificationKey: {
        data: "",
        hash: Field(1),
      },
    },
  },
};

const typePropertyTest: Inferred["foo"]["bar"]["verificationKey"] extends VerificationKey
  ? true
  : false = true;

/* eslint-enable @typescript-eslint/no-unused-vars */
