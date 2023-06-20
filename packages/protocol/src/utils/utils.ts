// eslint-disable-next-line max-len
/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/ban-types, @typescript-eslint/no-unsafe-return,@typescript-eslint/no-empty-function */

import { TextEncoder } from "node:util";

import { Circuit, Field, Poseidon, Proof } from "snarkyjs";
import { TextDecoder } from "util";

export type ReturnType<FunctionType extends Function> = FunctionType extends (
  ...args: any[]
) => infer Return
  ? Return
  : any;

export type UnTypedClass = new (...args: any[]) => any;

export type TypedClass<Class> = new (...args: any[]) => Class;

export type Subclass<Class extends new (...args: any) => any> = (new (
  ...args: any
) => InstanceType<Class>) & {
  [Key in keyof Class]: Class[Key];
} & { prototype: InstanceType<Class> };

export function notInCircuit(): MethodDecorator {
  return function ReplacedFunction(
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const childFunction = descriptor.value;
    descriptor.value = function value(this: any, ...args: any[]) {
      if (Circuit.inCheckedComputation() || Circuit.inProver()) {
        throw new Error(
          `Method ${propertyKey.toString()} is supposed to be only called outside of the circuit`
        );
      }
      // eslint-disable-next-line max-len
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
      return childFunction.apply(this, args);
    };
    return descriptor;
  };
}

export function stringToField(value: string, throwOnOverflow = false) {
  const fieldSize = Field.sizeInBytes();

  const encoder = new TextEncoder();

  const stringBytes = Array.from(encoder.encode(value));

  const padding = Array.from<number>({
    length: fieldSize - stringBytes.length,
  }).fill(0);
  const data = stringBytes.concat(padding);

  if (data.length > fieldSize) {
    if (throwOnOverflow) {
      throw new Error(
        "Trying to encode a stringt that is larger than 256 bits"
      );
    }

    // Hash the result Field[] to reduce it to
    const chunks = data.reduce<number[][]>((a, b, index) => {
      const arrayIndex = index / fieldSize;
      if (a.length <= arrayIndex) {
        a.push([]);
      }
      a[arrayIndex].push(b);
      return a;
    }, []);
    return Poseidon.hash(chunks.map((x) => Field.fromBytes(x)));
  }

  return Field.fromBytes(data);
}

/**
 * Note: This only works for strings that have been encoded using the `throwOnOverflow` set to true
 */
export function fieldToString(value: Field | bigint): string {
  if (typeof value === "bigint") {
    value = Field(value);
  }
  const bytes = Field.toBytes(value);
  const decoder = new TextDecoder();

  return decoder.decode(new Uint8Array(bytes));
}

export function noop(): void {}
