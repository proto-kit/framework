import { Experimental, FlexibleProvablePure } from "snarkyjs";
import { Proof } from "snarkyjs/dist/node/lib/proof_system";
import { Memoize } from "typescript-memoize";

export interface CompileArtifact {
  verificationKey: string;
}

export interface PlainZkProgram<PublicInput, PublicOutput = void> {
  compile: () => Promise<CompileArtifact>;
  verify: (proof: Proof<PublicInput, PublicOutput>) => Promise<boolean>;
  Proof: ReturnType<
    typeof Experimental.ZkProgram.Proof<
      FlexibleProvablePure<PublicInput>,
      FlexibleProvablePure<PublicOutput>
    >
  >;
  methods: Record<
    string,
    (
      publicInput: PublicInput,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...args: any
    ) => Promise<Proof<PublicInput, PublicOutput>>
  >;
}

export abstract class ZkProgrammable<PublicInput, PublicOutput> {
  public abstract zkProgramFactory(): PlainZkProgram<PublicInput, PublicOutput>;

  @Memoize()
  public get zkProgram(): PlainZkProgram<PublicInput, PublicOutput> {
    return this.zkProgramFactory();
  }
}
