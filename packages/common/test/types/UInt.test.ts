import { UInt112 } from "../../src";

describe("uint112", () => {
  it("should initialize correctly", () => {
    expect.assertions(1);

    const uint = UInt112.from(1);

    expect(uint.value.toBigInt()).toBe(1n);
  });

  it("should mul correctly", () => {
    expect.assertions(1);

    const uint = UInt112.from(101);

    expect(uint.mul(987654).toBigInt()).toBe(101n * 987654n)
  });

  it("should fail for init with higher value", () => {
    expect.assertions(1);

    expect(() => {
      UInt112.from(2n ** 128n);
    }).toThrow(/.*/u);
  });

  it("should fail for overflow addition", () => {
    expect.assertions(1);

    const uint = UInt112.from(2n ** 111n + 1n);

    expect(() => {
      uint.add(uint.value.toBigInt());
    }).toThrow(/.*/u);
  });

  it("should fail for overflow multiplication", () => {
    expect.assertions(1);

    const uint = UInt112.from(2n ** 110n);

    expect(() => {
      uint.mul(uint.value.toBigInt());
    }).toThrow(/.*/u);
  });
});
