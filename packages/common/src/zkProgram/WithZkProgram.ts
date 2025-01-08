import {
  DynamicProof,
  Field,
  FlexibleProvablePure,
  Proof,
  Provable,
  ZkProgram,
} from "o1js";

export type O1JSPrimitive = object | string | boolean | number;
export type ArgumentTypes = (
  | O1JSPrimitive
  | Proof<unknown, unknown>
  | DynamicProof<unknown, unknown>
)[];
export type DecoratedMethod = (...args: ArgumentTypes) => Promise<unknown>;

export interface CompileArtifact {
  verificationKey: {
    data: string;
    hash: Field;
  };
}

export interface AreProofsEnabled {
  areProofsEnabled: boolean;
  setProofsEnabled: (areProofsEnabled: boolean) => void;
}

export interface Verify<PublicInput, PublicOutput> {
  (proof: Proof<PublicInput, PublicOutput>): Promise<boolean>;
}

export interface Compile {
  (): Promise<CompileArtifact>;
}

export interface PlainZkProgram<PublicInput = undefined, PublicOutput = void> {
  compile: Compile;
  verify: Verify<PublicInput, PublicOutput>;
  Proof: ReturnType<
    typeof ZkProgram.Proof<
      FlexibleProvablePure<PublicInput>,
      FlexibleProvablePure<PublicOutput>
    >
  >;
  methods: Record<
    string,
    (...args: any) => Promise<{
      proof: Proof<PublicInput, PublicOutput>;
      auxiliaryOutput: undefined;
    }>
  >;
  analyzeMethods: () => Promise<
    Record<string, Awaited<ReturnType<typeof Provable.constraintSystem>>>
  >;
  proofsEnabled: boolean;
  setProofsEnabled(proofsEnabled: boolean): void;
}

export interface ZkProgramFactory<PublicInput, PublicOutput> {
  zkProgramFactory(): PlainZkProgram<PublicInput, PublicOutput>[];
}

export interface WithZkProgram<PublicInput = undefined, PublicOutput = void> {
  readonly zkProgramFactory: ZkProgramFactory<PublicInput, PublicOutput>;

  readonly zkProgram: PlainZkProgram<PublicInput, PublicOutput>[];
}

export const MOCK_PROOF = "mock-proof";

export const MOCK_VERIFICATION_KEY = {
  data: "mock-verification-key",
  hash: Field(0),
};

export function toProver(
  methodName: string,
  simulatedMethod: DecoratedMethod,
  isFirstParameterPublicInput: boolean,
  areProofsEnabled: boolean,
  ...args: ArgumentTypes
) {
  return async function prover(this: ZkProgramFactory<any, any>) {
    for (const prog of this.zkProgramFactory()) {
      if (Object.keys(prog.methods).includes(methodName)) {
        prog.proofsEnabled = areProofsEnabled;
        const programProvableMethod = prog.methods[methodName];
        // eslint-disable-next-line no-await-in-loop
        return await Reflect.apply(programProvableMethod, this, args);
      }
    }
    throw Error("No zkProgram found with given method.");
  };
}
