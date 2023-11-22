// eslint-disable-next-line max-len
/* eslint-disable @typescript-eslint/no-magic-numbers,prefer-const,id-length,no-underscore-dangle,putout/putout */
import { Bool, Field, Provable, Struct, UInt32, UInt64 } from "o1js";
import { assert } from "@proto-kit/protocol";

export abstract class UIntX<This extends UIntX<any>> extends Struct({
  value: Field,
}) {
  public readonly NUM_BITS: number;

  protected static readonly assertionFunction: (bool: Bool, msg?: string) => void =
    assert;
  // private readonly assertion_fn: (bool: Bool, msg?: string) => void = (bool, msg) => { bool.assertTrue(msg) }

  public static checkConstant(x: Field, numBits: number) {
    if (!x.isConstant()) {
      return x;
    }
    let xBig = x.toBigInt();
    if (xBig < 0n || xBig >= 1n << BigInt(numBits)) {
      throw new Error(
        `UIntX: Expected number between 0 and 2^${numBits} - 1, got ${xBig}`
      );
    }
    return x;
  }

  /**
   * Creates a {@link UInt64} with a value of 18,446,744,073,709,551,615.
   */
  protected static maxIntField(numBits: number): Field {
    return Field((1n << BigInt(numBits)) - 1n);
  }

  protected constructor(
    value: Field,
    bits: number,
    private readonly impls: {
      creator: (value: Field) => This;
      from: (value: Field | This | bigint | number | string) => This;
    }
  ) {
    super({ value });

    if (bits % 16 !== 0) {
      throw new Error("Can only create rangechecks for multiples of 16 bits");
    }

    if (bits <= 64) {
      throw new Error(
        "For numBits 32 and 64 use UInt32 and UInt64 respectively"
      );
    }

    this.NUM_BITS = bits;
  }

  /**
   * Turns the {@link UIntX} into a string.
   * @returns
   */
  public toString() {
    return this.value.toString();
  }

  /**
   * Turns the {@link UInt64} into a {@link BigInt}.
   * @returns
   */
  public toBigInt() {
    return this.value.toBigInt();
  }

  /**
   * Integer division with remainder.
   *
   * `x.divMod(y)` returns the quotient and the remainder.
   */
  public divMod(y: This | bigint | number | string) {
    let x = this.value;
    let y_ = this.impls.from(y).value;

    if (this.value.isConstant() && y_.isConstant()) {
      let xn = x.toBigInt();
      let yn = y_.toBigInt();
      let q = xn / yn;
      let r = xn - q * yn;
      return {
        quotient: this.impls.creator(Field(q)),
        rest: this.impls.creator(Field(r)),
      };
    }

    y_ = y_.seal();

    let q = Provable.witness(
      Field,
      () => new Field(x.toBigInt() / y_.toBigInt())
    );

    UIntX.assertionFunction(
      q.rangeCheckHelper(this.NUM_BITS).equals(q),
      "Divison overflowing"
    );

    // eslint-disable-next-line no-warning-comments
    // TODO: Could be a bit more efficient
    let r = x.sub(q.mul(y_)).seal();

    UIntX.assertionFunction(
      r.rangeCheckHelper(this.NUM_BITS).equals(r),
      "Divison overflowing, remainder"
    );

    let r_ = this.impls.creator(r);
    let q_ = this.impls.creator(q);

    UIntX.assertionFunction(
      r_.lessThan(this.impls.creator(y_)),
      "Divison failure, remainder larger than divisor"
    );

    return { quotient: q_, rest: r_ };
  }

  /**
   * Integer division.
   *
   * `x.div(y)` returns the floor of `x / y`, that is, the greatest
   * `z` such that `z * y <= x`.
   *
   */
  public div(y: This | bigint | number): This {
    return this.divMod(y).quotient;
  }

  /**
   * Integer remainder.
   *
   * `x.mod(y)` returns the value `z` such that `0 <= z < y` and
   * `x - z` is divisble by `y`.
   */
  public mod(y: This | bigint | number) {
    return this.divMod(y).rest;
  }

  /**
   * Multiplication with overflow checking.
   */
  public mul(y: This | bigint | number) {
    let z = this.value.mul(this.impls.from(y).value);
    UIntX.assertionFunction(
      z.rangeCheckHelper(this.NUM_BITS).equals(z),
      "Multiplication overflowing"
    );
    return this.impls.creator(z);
  }

  /**
   * Addition with overflow checking.
   */
  public add(y: This | bigint | number) {
    let z = this.value.add(this.impls.from(y).value);
    UIntX.assertionFunction(
      z.rangeCheckHelper(this.NUM_BITS).equals(z),
      "Addition overflowing"
    );
    return this.impls.creator(z);
  }

  /**
   * Subtraction with underflow checking.
   */
  public sub(y: This | bigint | number) {
    let z = this.value.sub(this.impls.from(y).value);
    UIntX.assertionFunction(
      z.rangeCheckHelper(this.NUM_BITS).equals(z),
      "Subtraction overflow"
    );
    return this.impls.creator(z);
  }

  /**
   * Checks if a {@link UInt64} is less than or equal to another one.
   */
  public lessThanOrEqual(y: This) {
    if (this.value.isConstant() && y.value.isConstant()) {
      return Bool(this.value.toBigInt() <= y.value.toBigInt());
    }
    let xMinusY = this.value.sub(y.value).seal();
    let yMinusX = xMinusY.neg();
    let xMinusYFits = xMinusY.rangeCheckHelper(UInt64.NUM_BITS).equals(xMinusY);
    let yMinusXFits = yMinusX.rangeCheckHelper(UInt64.NUM_BITS).equals(yMinusX);
    UIntX.assertionFunction(xMinusYFits.or(yMinusXFits));
    // x <= y if y - x fits in 64 bits
    return yMinusXFits;
  }

  /**
   * Asserts that a {@link UInt64} is less than or equal to another one.
   */
  public assertLessThanOrEqual(y: This, message?: string) {
    if (this.value.isConstant() && y.value.isConstant()) {
      let x0 = this.value.toBigInt();
      let y0 = y.value.toBigInt();
      if (x0 > y0) {
        if (message !== undefined) {
          throw new Error(message);
        }
        throw new Error(
          `UInt64.assertLessThanOrEqual: expected ${x0} <= ${y0}`
        );
      }
      return;
    }
    let yMinusX = y.value.sub(this.value).seal();
    UIntX.assertionFunction(
      yMinusX.rangeCheckHelper(UInt64.NUM_BITS).equals(yMinusX),
      message
    );
  }

  /**
   *
   * Checks if a {@link UInt64} is less than another one.
   */
  public lessThan(y: This) {
    return this.lessThanOrEqual(y).and(this.value.equals(y.value).not());
  }

  /**
   * Asserts that a {@link UInt64} is less than another one.
   */
  public assertLessThan(y: This, message?: string) {
    UIntX.assertionFunction(this.lessThan(y), message);
  }

  /**
   * Checks if a {@link UInt64} is greater than another one.
   */
  public greaterThan(y: This) {
    return y.lessThan(this);
  }

  /**
   * Asserts that a {@link UInt64} is greater than another one.
   */
  public assertGreaterThan(y: This, message?: string) {
    y.assertLessThan(this, message);
  }

  /**
   * Checks if a {@link UInt64} is greater than or equal to another one.
   */
  public greaterThanOrEqual(y: This) {
    return this.lessThan(y).not();
  }

  /**
   * Asserts that a {@link UInt64} is greater than or equal to another one.
   */
  public assertGreaterThanOrEqual(y: This, message?: string) {
    y.assertLessThanOrEqual(this, message);
  }

  /**
   * Turns the {@link UInt64} into a {@link UInt32}, asserting that it fits in 32 bits.
   */
  public toUInt64() {
    let uint64 = new UInt64(this.value);
    UInt64.check(uint64);
    return uint64;
  }

  /**
   * Turns the {@link UIntX} into a {@link UInt64}, clamping to the 64 bits range if it's too large.
   * ```ts
   * UInt64.from(4294967296).toUInt32Clamped().toString(); // "4294967295"
   * ```
   */
  public toUInt64Clamped() {
    let max = (1n << 64n) - 1n;
    return Provable.if(
      this.greaterThan(this.impls.from(max)),
      UInt64.from(max),
      new UInt64(this.value)
    );
  }
}
