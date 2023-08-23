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
