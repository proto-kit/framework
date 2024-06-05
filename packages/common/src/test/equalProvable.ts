import { Field } from "o1js";

export function equalProvable(received: Field[], expected: Field[]) {
  expect(received).toHaveLength(expected.length);

  const receivedBigInts = received.map((f) => f.toBigInt());
  const expectedBigInts = expected.map((f) => f.toBigInt());

  const pass = receivedBigInts.every(
    (v, index) => v === expectedBigInts[index]
  );
  return {
    message: () => `Expected ${expectedBigInts}, received ${receivedBigInts}`,
    pass,
  };
}

expect.extend({
  equalProvable,
});

interface CustomMatchers<R = void> {
  equalProvable(expected: Field[]): R;
}

declare global {
  namespace jest {
    interface Expect extends CustomMatchers {}
    interface Matchers<R> extends CustomMatchers<R> {}
    interface InverseAsymmetricMatchers extends CustomMatchers {}
  }
}
