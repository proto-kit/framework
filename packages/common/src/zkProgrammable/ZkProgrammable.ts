import { Experimental, FlexibleProvablePure, Proof } from "o1js";
import { Memoize } from "typescript-memoize";

import { MOCK_PROOF } from "./provableMethod";

const errors = {
  appChainNotSet: (name: string) =>
    new Error(`Appchain was not injected for: ${name}`),
};

export interface CompileArtifact {
  verificationKey: string;
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
    typeof Experimental.ZkProgram.Proof<
      FlexibleProvablePure<PublicInput>,
      FlexibleProvablePure<PublicOutput>
    >
  >;
  analyzeMethods(): any;
  methods: Record<
    string,
    | ((
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...args: any
      ) => Promise<Proof<PublicInput, PublicOutput>>)
    | ((
        publicInput: PublicInput,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...args: any
      ) => Promise<Proof<PublicInput, PublicOutput>>)
  >;
}

export function verifyToMockable<PublicInput, PublicOutput>(
  verify: Verify<PublicInput, PublicOutput>,
  areProofsEnabled: AreProofsEnabled
) {
  return async (proof: Proof<PublicInput, PublicOutput>) => {
    if (areProofsEnabled.areProofsEnabled) {
      let verified = false;

      try {
        verified = await verify(proof);
      } catch (error: unknown) {
        // silently fail verification
        console.error(error);
        verified = false;
      }

      return verified;
    }

    return proof.proof === MOCK_PROOF;
  };
}

export const MOCK_VERIFICATION_KEY = "mock-verification-key";

export function compileToMockable(
  compile: Compile,
  areProofsEnabled: AreProofsEnabled
): () => Promise<CompileArtifact> {
  return async () => {
    console.log("mocked compile", {
      areProofsEnabled: areProofsEnabled.areProofsEnabled,
    });
    if (areProofsEnabled.areProofsEnabled) {
      return await compile();
    }

    return {
      verificationKey: MOCK_VERIFICATION_KEY,
    };
  };
}

export abstract class ZkProgrammable<
  PublicInput = undefined,
  PublicOutput = void
> {
  public abstract get appChain(): AreProofsEnabled | undefined;

  public abstract zkProgramFactory(): PlainZkProgram<PublicInput, PublicOutput>;

  @Memoize()
  public get zkProgram(): PlainZkProgram<PublicInput, PublicOutput> {
    const zkProgram = this.zkProgramFactory();

    if (!this.appChain) {
      throw errors.appChainNotSet(this.constructor.name);
    }

    console.log("getting zkProgram()", {
      areProofsEnabled: this.appChain.areProofsEnabled,
    });

    return {
      ...zkProgram,
      verify: verifyToMockable(zkProgram.verify, this.appChain),
      compile: compileToMockable(zkProgram.compile, this.appChain),
    };
  }
}

export interface WithZkProgrammable<
  PublicInput = undefined,
  PublicOutput = void
> {
  zkProgrammable: ZkProgrammable<PublicInput, PublicOutput>;
}
