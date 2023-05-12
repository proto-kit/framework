/* eslint-disable @typescript-eslint/no-explicit-any */
import { Circuit, Field, type Proof, Struct } from "snarkyjs";
import {TextEncoder} from 'node:util';

export function NotInCircuit() {
  return function F(target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const childFunction = descriptor.value;
    descriptor.value = function value(this: any, ...args: any[]) {
      if (Circuit.inCheckedComputation() || Circuit.inProver()) {
        throw new Error(`Method ${  propertyKey.toString()  } is supposed to be only called outside of the circuit`);
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
      return childFunction.apply(this, args);
    };
    return descriptor;
  };
}

export function structArrayToFields(...args: { toFields: () => Field[] }[]): Field[] {
  return args.flatMap(x => x.toFields());
}

// eslint-disable-next-line @typescript-eslint/ban-types
export type ReturnType<T extends Function> = T extends ((...args: any[]) => infer R) ? R : any

export type ClassType = new(...args: any[]) => any

export type TypedClassType<T> = new(...args: any[]) => T

export type Subclass<Class extends new (...args: any) => any> = (new (
  ...args: any
) => InstanceType<Class>) & {
  [K in keyof Class]: Class[K];
} & { prototype: InstanceType<Class> };

export function Struct2<T>(t: T): ReturnType<typeof Struct<T>> {
  const X: ReturnType<typeof Struct<T>> = Struct(t);
  return X;
}

export type ZkProgramType<PublicInputType, PublicOutputType> = {
  name: string;
  compile: () => Promise<{ verificationKey: string }>;
  verify: (proof: Proof<PublicInputType, PublicOutputType>) => Promise<boolean>;
  digest: () => string;

  // analyzeMethods: () => ReturnType<typeof analyzeMethod>[];
  publicInputType: TypedClassType<PublicInputType>;
  publicOutputType: TypedClassType<PublicOutputType>;
};


