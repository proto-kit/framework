import { ZkProgram, FlexibleProvablePure, Proof, Field, Provable } from "o1js";
import { Memoize } from "typescript-memoize";

import { log } from "../log";

import { MOCK_PROOF } from "./provableMethod";

const errors = {
  appChainNotSet: (name: string) =>
    new Error(`Appchain was not injected for: ${name}`),
};

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
    | ((...args: any) => Promise<Proof<PublicInput, PublicOutput>>)
    | ((
        publicInput: PublicInput,
        ...args: any
      ) => Promise<Proof<PublicInput, PublicOutput>>)
  >;
  analyzeMethods: () => Promise<
    Record<string, Awaited<ReturnType<typeof Provable.constraintSystem>>>
  >;
}

export function verifyToMockable<PublicInput, PublicOutput>(
  verify: Verify<PublicInput, PublicOutput>,
  { areProofsEnabled }: AreProofsEnabled
) {
  return async (proof: Proof<PublicInput, PublicOutput>) => {
    if (areProofsEnabled) {
      let verified = false;

      try {
        verified = await verify(proof);
      } catch (error: unknown) {
        // silently fail verification
        log.error(error);
        verified = false;
      }

      return verified;
    }

    return proof.proof === MOCK_PROOF;
  };
}

export const MOCK_VERIFICATION_KEY = {
  data: "mock-verification-key",
  hash: Field(0),
};

export function compileToMockable(
  compile: Compile,
  { areProofsEnabled }: AreProofsEnabled
): () => Promise<CompileArtifact> {
  return async () => {
    if (areProofsEnabled) {
      return await compile();
    }

    return {
      verificationKey: MOCK_VERIFICATION_KEY,
    };
  };
}

export abstract class ZkProgrammable<
  PublicInput = undefined,
  PublicOutput = void,
> {
  public abstract get appChain(): AreProofsEnabled | undefined;

  public abstract zkProgramFactory(): PlainZkProgram<PublicInput, PublicOutput>;

  @Memoize()
  public get zkProgram(): PlainZkProgram<PublicInput, PublicOutput> {
    const zkProgram = this.zkProgramFactory();

    if (!this.appChain) {
      throw errors.appChainNotSet(this.constructor.name);
    }

    return {
      ...zkProgram,
      verify: verifyToMockable(zkProgram.verify, this.appChain),
      compile: compileToMockable(zkProgram.compile, this.appChain),
    };
  }
}

export interface WithZkProgrammable<
  PublicInput = undefined,
  PublicOutput = void,
> {
  zkProgrammable: ZkProgrammable<PublicInput, PublicOutput>;
}
