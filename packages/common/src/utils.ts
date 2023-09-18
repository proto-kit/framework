import { Field, FlexibleProvablePure } from "snarkyjs";

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
  return Array.from({ length: end - startOrEnd }, (ignored, index) => index);
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
