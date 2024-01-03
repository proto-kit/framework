import { Field, FlexibleProvablePure } from "o1js";

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

export function range(startOrEnd: number, end: number | undefined): number[] {
  if (end === undefined) {
    end = startOrEnd;
    startOrEnd = 0;
  }
  return Array.from(
    { length: end - startOrEnd },
    (ignored, index) => index + startOrEnd
  );
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

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function noop(): void {}

export interface ToFieldable {
  toFields: () => Field[];
}

export async function sleep(ms: number) {
  // eslint-disable-next-line promise/avoid-new,no-promise-executor-return
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function filterNonNull<Type>(value: Type | null): value is Type {
  return value !== null;
}

export function filterNonUndefined<Type>(
  value: Type | undefined
): value is Type {
  return value !== null;
}
