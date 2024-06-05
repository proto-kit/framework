import "reflect-metadata";
import { container } from "tsyringe";
import { RuntimeMethodExecutionContext, State } from "@proto-kit/protocol";
import { beforeEach } from "@jest/globals";
// @ts-ignore
import bigintsqrt from "bigint-isqrt";
import { Bool, Field, Provable } from "o1js";

import { UInt112, UInt64 } from "../../src";

describe("uint112", () => {
  const executionContext = container.resolve(RuntimeMethodExecutionContext);

  beforeEach(() => {
    executionContext.clear();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    executionContext.setup({} as any);
  });

  it("regression - Provable.if impls", () => {
    const uint = UInt112.Unsafe.fromField(Field(1));

    const x = Provable.if(Bool(true), UInt112, uint, uint);
    const y = new UInt112(x).add(3);

    expect(y.toBigInt()).toBe(4n);
  });

  it("should initialize correctly", () => {
    expect.assertions(2);

    const uint = UInt112.from(1);

    expect(uint.value.toBigInt()).toBe(1n);
    expect(executionContext.result.status.toBoolean()).toBe(true);
  });

  it("should mul correctly", () => {
    expect.assertions(2);

    const uint = UInt112.from(101);

    expect(uint.mul(987654).toBigInt()).toBe(101n * 987654n);
    expect(executionContext.result.status.toBoolean()).toBe(true);
  });

  it("should fail for init with higher value", () => {
    expect.assertions(1);

    // We throw on constant inits
    expect(() => {
      UInt112.from(2n ** 128n);
    }).toThrow(/.*/u);
  });

  it("should fail for overflow addition", () => {
    expect.assertions(1);

    const uint = UInt112.from(2n ** 111n + 1n);

    uint.add(uint.value.toBigInt());

    expect(executionContext.result.status.toBoolean()).toBe(false);
  });

  it("should fail for overflow multiplication", () => {
    expect.assertions(1);

    const uint = UInt112.from(2n ** 110n);

    uint.mul(uint.value.toBigInt());

    expect(executionContext.result.status.toBoolean()).toBe(false);
  });

  it.each([5n, 0n, 101n, 2n ** 112n - 1n])(
    "should provide correct sqrt",
    (input) => {
      const uint = UInt112.from(input);

      const { sqrt, rest } = uint.sqrtMod();

      expect(sqrt.toBigInt()).toBe(bigintsqrt(input));
      expect(rest.toBigInt()).toBe(input - bigintsqrt(input) ** 2n);
    }
  );

  const max64 = 2n ** 64n - 1n;

  it.each([
    [1n, 2n],
    [1n, 1n],
    [max64, max64],
    [max64, max64 - 1n],
    [max64, 0n],
  ])("should check equals correctly", (a, b) => {
    expect.assertions(3);

    const equals = a === b;
    const equalsBool1 = UInt64.from(a).equals(b);
    const equalsBool2 = UInt64.from(a).equals(UInt64.from(b));
    const equalsBool3 = UInt64.from(b).equals(a);

    expect(equalsBool1.toBoolean()).toStrictEqual(equalsBool2.toBoolean());
    expect(equalsBool2.toBoolean()).toStrictEqual(equalsBool3.toBoolean());
    expect(equalsBool1.toBoolean()).toBe(equals);
  });

  it("should compile witness", () => {
    expect.assertions(4);

    const uint = Provable.witness(UInt64, () => UInt64.from(5));

    const fields = UInt64.toFields(uint);

    expect(uint.numBits()).toBe(64);
    expect(uint.value.toBigInt()).toBe(5n);
    expect(fields.length).toBe(1);
    expect(fields[0].toBigInt()).toBe(5n);
  });

  it("should work for state", () => {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    expect.assertions(1);

    // Only a compilation test
    const state = State.from(UInt64);
    const state2 = State.from<UInt64>(UInt64);

    expect(1).toBe(1);
    /* eslint-enable @typescript-eslint/no-unused-vars */
  });
});
