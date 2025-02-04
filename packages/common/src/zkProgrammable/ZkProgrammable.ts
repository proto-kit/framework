import { ZkProgram, FlexibleProvablePure, Proof, Field, Provable } from "o1js";
import { Memoize } from "typescript-memoize";

import { log } from "../log";
import { dummyVerificationKey } from "../dummyVerificationKey";
import { reduceSequential } from "../utils";
import type { CompileRegistry } from "../compiling/CompileRegistry";

import { MOCK_PROOF } from "./provableMethod";

const errors = {
  areProofsEnabledNotSet: (name: string) =>
    new Error(`AreProofsEnabled was not injected for: ${name}`),
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
  name: string;
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

export const MOCK_VERIFICATION_KEY = dummyVerificationKey();

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
  public abstract get areProofsEnabled(): AreProofsEnabled | undefined;

  public abstract zkProgramFactory(): PlainZkProgram<
    PublicInput,
    PublicOutput
  >[];

  private zkProgramSingleton?: PlainZkProgram<PublicInput, PublicOutput>[];

  @Memoize()
  public get zkProgram(): PlainZkProgram<PublicInput, PublicOutput>[] {
    if (this.zkProgramSingleton === undefined) {
      this.zkProgramSingleton = this.zkProgramFactory();
    }

    return this.zkProgramSingleton.map((bucket) => {
      if (!this.areProofsEnabled) {
        throw errors.areProofsEnabledNotSet(this.constructor.name);
      }
      return {
        ...bucket,
        verify: verifyToMockable(bucket.verify, this.areProofsEnabled),
        compile: compileToMockable(bucket.compile, this.areProofsEnabled),
      };
    });
  }

  public async compile(registry: CompileRegistry) {
    return await reduceSequential(
      this.zkProgram,
      async (acc, program) => {
        const result = await registry.compile(program);
        return {
          ...acc,
          [program.name]: result,
        };
      },
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      {} as Record<string, CompileArtifact>
    );
  }
}

export interface WithZkProgrammable<
  PublicInput = undefined,
  PublicOutput = void,
> {
  zkProgrammable: ZkProgrammable<PublicInput, PublicOutput>;
}
