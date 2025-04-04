import {
  Field,
  FlexibleProvablePure,
  Poseidon,
  DynamicProof,
  Proof,
} from "o1js";
import _ from "lodash";

import { TypedClass } from "./types";

export function requireTrue(
  condition: boolean,
  errorOrFunction: Error | (() => Error)
): void {
  if (!condition) {
    throw typeof errorOrFunction === "function"
      ? errorOrFunction()
      : errorOrFunction;
  }
}

/**
 * Utility function to split an array of type T into a record <K, T[]> based on a
 * function T => K that determines the key of each record
 */
export function splitArray<T, K extends string | number>(
  arr: T[],
  split: (t: T) => K
): Record<K, T[] | undefined> {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const record = {} as { [Key in K]: T[] };
  arr.forEach((element) => {
    const k = split(element);
    if (record[k] !== undefined) {
      record[k].push(element);
    } else {
      record[k] = [element];
    }
  });
  return record;
}

export function range(
  startOrEnd: number,
  endOrNothing?: number | undefined
): number[] {
  let end = endOrNothing;
  let start = startOrEnd;
  if (end === undefined) {
    end = startOrEnd;
    start = 0;
  }
  return Array.from({ length: end - start }, (ignored, index) => index + start);
}

export function reduceSequential<T, U>(
  array: T[],
  callbackfn: (
    previousValue: U,
    currentValue: T,
    currentIndex: number,
    array: T[]
  ) => Promise<U>,
  initialValue: U
): Promise<U> {
  return array.reduce<Promise<U>>(
    async (previousPromise, current, index, arr) => {
      const previous = await previousPromise;
      return await callbackfn(previous, current, index, arr);
    },
    Promise.resolve(initialValue)
  );
}

export function yieldSequential<Source, State, Target>(
  array: Source[],
  callbackfn: (
    previousValue: State,
    currentValue: Source,
    currentIndex: number,
    array: Source[]
  ) => Promise<[State, Target]>,
  initialValue: State
): Promise<[State, Target[]]> {
  return reduceSequential<Source, [State, Target[]]>(
    array,
    async ([state, collectedTargets], curr, index, arr) => {
      const [newState, addition] = await callbackfn(state, curr, index, arr);
      return [newState, collectedTargets.concat(addition)];
    },
    [initialValue, []]
  );
}

export function mapSequential<T, R>(
  array: T[],
  f: (element: T, index: number, array: T[]) => Promise<R>
): Promise<R[]> {
  return array.reduce<Promise<R[]>>(async (r, element, index, a) => {
    const ret = await r;
    const next = await f(element, index, a);
    ret.push(next);
    return ret;
  }, Promise.resolve([]));
}

/**
 * Computes a dummy value for the given value type.
 *
 * @param valueType - Value type to generate the dummy value for
 * @returns Dummy value for the given value type
 */
export function dummyValue<Value>(
  valueType: FlexibleProvablePure<Value>
): Value {
  const length = valueType.sizeInFields();
  const fields = Array.from({ length }, () => Field(0));

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return valueType.fromFields(fields) as Value;
}

export function noop(): void {}

export interface ToFieldable {
  toFields: () => Field[];
}

export interface ToFieldableStatic {
  toFields: (value: unknown) => Field[];
}

export interface ToJSONableStatic {
  toJSON: (value: unknown) => any;
}

// export interface ProofTypes {
//   publicOutputType?: ToFieldableStatic;
//   publicInputType?: ToFieldableStatic;
// }

export type ProofTypes =
  | typeof Proof<unknown, unknown>
  | typeof DynamicProof<unknown, unknown>;

export async function sleep(ms: number) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function filterNonNull<Type>(value: Type | null): value is Type {
  return value !== null;
}

export function filterNonUndefined<Type>(
  value: Type | undefined
): value is Type {
  return value !== undefined;
}

const encoder = new TextEncoder();

// Copied from o1js binable.ts:317
export function prefixToField(prefix: string): Field {
  const fieldSize = Field.sizeInBytes;
  if (prefix.length >= fieldSize) throw Error("prefix too long");
  const stringBytes = [...encoder.encode(prefix)];
  return Field.fromBytes(
    stringBytes.concat(Array(fieldSize - stringBytes.length).fill(0))
  );
}

export function hashWithPrefix(prefix: string, input: Field[]) {
  const salt = Poseidon.update(
    [Field(0), Field(0), Field(0)],
    [prefixToField(prefix)]
  );
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return Poseidon.update(salt as [Field, Field, Field], input)[0];
}

// end copy

export function expectDefined<T>(value: T | undefined): asserts value is T {
  expect(value).toBeDefined();
}

type NonMethodKeys<Type> = {
  [Key in keyof Type]: Type[Key] extends Function ? never : Key;
}[keyof Type];
export type NonMethods<Type> = Pick<Type, NonMethodKeys<Type>>;

export const MAX_FIELD = Field(Field.ORDER - 1n);

/**
 * Returns a boolean indicating whether a given class is a subclass of another class,
 * indicated by the name parameter.
 */
// TODO Change to class reference based comparisons
export function isSubtypeOfName(
  clas: TypedClass<unknown>,
  name: string
): boolean {
  if (clas === undefined || clas === null) {
    return false;
  }

  if (clas.name === name) {
    return true;
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  return isSubtypeOfName(Object.getPrototypeOf(clas), name);
}

// TODO Eventually, replace this by a schema validation library
export function safeParseJson<T>(json: string) {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return JSON.parse(json) as T;
}

export type Nullable<T> = {
  [Key in keyof T]: T[Key] | undefined;
};

export function isFull<T>(t: Nullable<T>): t is T {
  return Object.values(t).findIndex((v) => v === undefined) === -1;
}

// TODO Restructure utils into separate package and multiple files

export function padArray<T>(
  array: T[],
  batchSize: number,
  generator: (index: number) => T
): T[] {
  const slice = array.slice();
  const dummies = range(0, batchSize - (array.length % batchSize)).map((i) =>
    generator(i + array.length)
  );
  slice.push(...dummies);
  return slice;
}

export function batch<T>(
  arr: T[],
  batchSize: number,
  dummy: (index: number) => T
): T[][] {
  const padded = padArray(arr, batchSize, dummy);

  const partitioned = _.groupBy(
    padded.map((v, i) => [v, i] as const),
    ([v, i]) => Math.floor(i / batchSize)
  );

  const numBatches = Math.ceil(arr.length / batchSize);

  return range(0, numBatches).map((i) => partitioned[i].map((x) => x[0]));
}

export type Reference<T> = {
  set value(value: T);
  get value(): T;
};

class ReferenceObject<T> {
  public constructor(private internalValue: T) {}

  get value() {
    return this.internalValue;
  }

  set value(t: T) {
    this.internalValue = t;
  }
}

export function createReference<T>(initial: T): Reference<T> {
  return new ReferenceObject(initial);
}
