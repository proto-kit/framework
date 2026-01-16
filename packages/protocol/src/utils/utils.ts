import { Bool, Field, Poseidon, Provable } from "o1js";
import floor from "lodash/floor";

import { NetworkState } from "../model/network/NetworkState";

export type ReturnType<FunctionType extends Function> = FunctionType extends (
  ...args: any[]
) => infer Return
  ? Return
  : any;

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
      if (Provable.inCheckedComputation() || Provable.inProver()) {
        throw new Error(
          `Method ${propertyKey.toString()} is supposed to be only called outside of the circuit`
        );
      }
      return childFunction.apply(this, args);
    };
    return descriptor;
  };
}

export function networkStateToFields(json: NetworkState): Field[] {
  return [Field(json.block.height), Field(json.previous.rootHash)];
}

export function hashNetworkState(json: NetworkState): string {
  return Poseidon.hash(networkStateToFields(json)).toString();
}

export function stringToField(value: string) {
  const fieldSize = Field.sizeInBytes - 1;

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

    Array.from<number[]>({ length: floor(data.length / fieldSize) }).map(
      () => []
    )
  );
  const fields = chunks.map((x) =>
    // We have to add a zero at the highest byte here, because a Field is
    // a bit smaller than 2^256
    Field.fromBytes(x.concat([0]))
  );
  return Poseidon.hash(fields);
}

export function singleFieldToString(value: Field | bigint): string {
  let fieldValue = value;
  if (typeof value === "bigint") {
    fieldValue = Field(value);
  }
  return fieldValue.toString();
}

type NonMethodKeys<T> = {
  [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];
export type NonMethods<T> = Pick<T, NonMethodKeys<T>>;

/**
 * Asserts the equality of a and b, but only if doAssertion is true, otherwise it will assert 0 = 0
 */
export function assertEqualsIf(
  a: Field,
  b: Field,
  doAssertion: Bool,
  msg: string
) {
  a.mul(doAssertion.toField()).assertEquals(b.mul(doAssertion.toField()), msg);
}
