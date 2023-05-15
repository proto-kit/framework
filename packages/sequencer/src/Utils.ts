/* eslint-disable @typescript-eslint/no-explicit-any */
import { Circuit, Field, type Proof, Struct } from "snarkyjs";
import { TypedClassType } from "@yab/protocol";

export function structArrayToFields(...args: { toFields: () => Field[] }[]): Field[] {
  return args.flatMap(x => x.toFields());
}


export function Struct2<T>(t: T): ReturnType<typeof Struct<T>> {
  const X: ReturnType<typeof Struct<T>> = Struct(t);
  return X;
}

export type ZkProgramType<PublicInputType> = {
  name: string;
  compile: () => Promise<{ verificationKey: string }>;
  verify: (proof: Proof<PublicInputType>) => Promise<boolean>;
  digest: () => string;

  // analyzeMethods: () => ReturnType<typeof analyzeMethod>[];
  publicInputType: TypedClassType<PublicInputType>;
};



