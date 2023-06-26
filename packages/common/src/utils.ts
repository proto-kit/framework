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
