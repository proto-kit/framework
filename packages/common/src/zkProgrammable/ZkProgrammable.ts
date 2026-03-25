import {
  ZkProgram,
  FlexibleProvablePure,
  Proof,
  Field,
  Provable,
  Cache as O1Cache,
  DynamicProof,
  FlexibleProvable,
  FeatureFlags,
} from "o1js";
import { Memoize } from "typescript-memoize";

import { log } from "../log";
import { dummyVerificationKey } from "../dummyVerificationKey";
import { mapSequential, reduceSequential } from "../utils";
import type { CompileRegistry } from "../compiling/CompileRegistry";

import { MOCK_PROOF } from "./provableMethod";
import { combineFeatureFlags } from "./FeatureFlagsExtension";

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
  (options?: {
    cache?: O1Cache;
    forceRecompile?: boolean;
    proofsEnabled?: boolean;
    withRuntimeTables?: boolean;
    numChunks?: number;
    lazyMode?: boolean;
  }): Promise<CompileArtifact>;
}

export interface PlainZkProgram<
  PublicInput = undefined,
  PublicOutput = undefined,
> {
  name: string;
  publicInputType: FlexibleProvable<PublicInput>;
  publicOutputType: FlexibleProvable<PublicOutput>;
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
    | ((...args: any) => Promise<{
        proof: Proof<PublicInput, PublicOutput>;
        auxiliaryOutput: any;
      }>)
    | ((
        publicInput: PublicInput,
        ...args: any
      ) => Promise<{
        proof: Proof<PublicInput, PublicOutput>;
        auxiliaryOutput: any;
      }>)
  >;
  analyzeMethods: () => Promise<
    Record<
      string,
      Awaited<ReturnType<typeof Provable.constraintSystem>> & {
        // TODO Properly model ProofClass here
        proofs: any[];
      }
    >
  >;
  maxProofsVerified: () => Promise<0 | 1 | 2>;
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
): Compile {
  return async (...args) => {
    if (areProofsEnabled) {
      return await compile(...args);
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

  public abstract zkProgramFactory(): Promise<
    PlainZkProgram<PublicInput, PublicOutput>[]
  >;

  private zkProgramSingleton?: PlainZkProgram<PublicInput, PublicOutput>[];

  @Memoize()
  public async zkProgram(): Promise<
    PlainZkProgram<PublicInput, PublicOutput>[]
  > {
    if (this.zkProgramSingleton === undefined) {
      this.zkProgramSingleton = await this.zkProgramFactory();
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

  @Memoize()
  public async proofType(): Promise<typeof Proof<PublicInput, PublicOutput>> {
    const programs = await this.zkProgram();

    const Template = programs[0].Proof;
    const maxProofsVerifeds = await mapSequential(programs, (p) =>
      p.maxProofsVerified()
    );
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const maxProofsVerified = Math.max(...maxProofsVerifeds) as 0 | 1 | 2;

    return class ZkProgrammableProofType extends Proof<
      PublicInput,
      PublicOutput
    > {
      static publicInputType = Template.publicInputType;

      static publicOutputType = Template.publicOutputType;

      static maxProofsVerified = maxProofsVerified;
    };
  }

  @Memoize()
  public async dynamicProofType(): Promise<
    typeof DynamicProof<PublicInput, PublicOutput>
  > {
    const programs = await this.zkProgram();

    let maxProofsVerified: 0 | 1 | 2;
    let featureFlags: FeatureFlags;

    // We actually only need to compute maxProofsVerified and featuresflags if proofs
    // are enabled, otherwise o1js will ignore it anyways. This way startup is a bit
    // faster for non-proof environments
    if (this.areProofsEnabled?.areProofsEnabled === true) {
      const maxProofsVerifieds = await mapSequential(
        programs,
        async (zkProgram) => await zkProgram.maxProofsVerified()
      );
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      maxProofsVerified = Math.max(...maxProofsVerifieds) as 0 | 1 | 2;
      const featureFlagsSet = await mapSequential(
        programs,
        async (zkProgram) => await FeatureFlags.fromZkProgram(zkProgram)
      );
      featureFlags = featureFlagsSet.reduce(combineFeatureFlags);
    } else {
      featureFlags = FeatureFlags.allNone;
      maxProofsVerified = 0;
    }

    return class DynamicProofType extends DynamicProof<
      PublicInput,
      PublicOutput
    > {
      static publicInputType = programs[0].publicInputType;

      static publicOutputType = programs[0].publicOutputType;

      static maxProofsVerified = maxProofsVerified;

      static featureFlags = featureFlags;
    };
  }

  public async compile(registry: CompileRegistry) {
    const programs = await this.zkProgram();
    return await reduceSequential(
      programs,
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
