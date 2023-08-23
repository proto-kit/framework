// eslint-disable-next-line max-len
/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/ban-types, @typescript-eslint/no-unsafe-return,@typescript-eslint/no-empty-function */

import { TextEncoder, TextDecoder } from "node:util";

import { Circuit, Field, Poseidon, Proof } from "snarkyjs";
import floor from "lodash/floor";

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

export function stringToField(value: string) {
  const fieldSize = Field.sizeInBytes() - 1;

  // Encode string as byte[]
  const encoder = new TextEncoder();
  const stringBytes = Array.from(encoder.encode(value));

  // Add padding in case the string is not a multiple of Field.sizeInBytes
  const padding = Array.from<number>({
    length: fieldSize - (stringBytes.length % fieldSize),
  }).fill(0);
  const data = stringBytes.concat(padding).reverse();

  // Hash the result Field[] to reduce it to
  const chunks = data.reduce<number[][]>(
    (a, b, index) => {
      const arrayIndex = floor(index / fieldSize);
      a[arrayIndex].push(b);
      return a;
    },

    // eslint-disable-next-line array-func/from-map
    Array.from<number[]>({ length: floor(data.length / fieldSize) }).map(
      () => []
    )
  );
  const fields = chunks.map((x) => {
    // We have to add a zero at the highest byte here, because a Field is
    // a bit smaller than 2^256
    // console.log(x.concat([0]).length);
    return Field.fromBytes(x.concat([0]));
  });
  return Poseidon.hash(fields);
}

export function singleFieldToString(value: Field | bigint): string {
  if (typeof value === "bigint") {
    value = Field(value);
  }
  return value.toString();
}

export function noop(): void {}
