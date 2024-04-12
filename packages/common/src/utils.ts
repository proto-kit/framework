import { Field, FlexibleProvablePure, Poseidon } from "o1js";

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

export function range(
  startOrEnd: number,
  endOrNothing: number | undefined
): number[] {
  let end = endOrNothing;
  let start = startOrEnd;
  if (end === undefined) {
    end = startOrEnd;
    start = 0;
  }
  return Array.from({ length: end - start }, (ignored, index) => index + start);
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

export interface ProofTypes {
  publicOutputType?: ToFieldableStatic;
  publicInputType?: ToFieldableStatic;
}

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
  const fieldSize = Field.sizeInBytes();
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
