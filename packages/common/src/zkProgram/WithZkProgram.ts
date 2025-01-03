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

export interface ZkProgramFactories<PublicInput, PublicOutput> {
  zkProgramFactory(): () => PlainZkProgram<PublicInput, PublicOutput>[];
}

export abstract class WithZkProgram<
  PublicInput = undefined,
  PublicOutput = void,
> {
  zkProgramInstance: PlainZkProgram<PublicInput, PublicOutput>[];

  constructor(
    zkProgramFactory: () => PlainZkProgram<PublicInput, PublicOutput>[],
    proofsEnabled: AreProofsEnabled
  ) {
    this.zkProgramInstance = zkProgramFactory();
  }

  public get zkProgram() {
    return this.zkProgramInstance;
  }
}
