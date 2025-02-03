import {
  DynamicProof,
  FlexibleProvablePure,
  Proof,
  Provable,
  ZkProgram,
} from "o1js";

import { CompileRegistry } from "../compiling/CompileRegistry";

import { Compile, CompileArtifact } from "./Helper";

export type O1JSPrimitive = object | string | boolean | number;
export type ArgumentTypes = (
  | O1JSPrimitive
  | Proof<unknown, unknown>
  | DynamicProof<unknown, unknown>
)[];
export type DecoratedMethod = (...args: ArgumentTypes) => Promise<unknown>;

export interface Verify<PublicInput, PublicOutput> {
  (proof: Proof<PublicInput, PublicOutput>): Promise<boolean>;
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
  compile(registry: CompileRegistry): Promise<Record<string, CompileArtifact>>;
  // appChain: AreProofsEnabled | undefined;
}

export interface WithZkProgram<PublicInput = undefined, PublicOutput = void> {
  readonly zkProgramFactory: ZkProgramFactory<PublicInput, PublicOutput>;

  readonly zkProgram: PlainZkProgram<PublicInput, PublicOutput>[];
}

export function toProver(
  methodName: string,
  areProofsEnabled: boolean,
  ...args: ArgumentTypes
) {
  return async function prover(this: ZkProgramFactory<any, any>) {
    const zkProgram = this.zkProgramFactory().find((prog) =>
      Object.keys(prog.methods).includes(methodName)
    );

    if (zkProgram === undefined) {
      throw new Error("Correct ZkProgram not found");
    }

    const programProvableMethod = zkProgram.methods[methodName];
    return await Reflect.apply(programProvableMethod, this, args);
  };
}
