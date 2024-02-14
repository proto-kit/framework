// eslint-disable-next-line max-len
/* eslint-disable @typescript-eslint/no-magic-numbers,prefer-const,id-length,no-underscore-dangle,putout/putout */
import { Bool, Field, Provable, Struct, UInt64 } from "o1js";
import { assert } from "@proto-kit/protocol";
import bigintSqrt from "bigint-isqrt";

const errors = {
  usageWith256BitsForbidden: () =>
    new Error(
      "Usage with 256 bits forbidden, this would lead to unexpected behaviour"
    ),
  canOnlyCreateMultiplesOf16Bits: () =>
    new Error("Can only create rangechecks for multiples of 16 bits"),
};

export abstract class UIntX<This extends UIntX<any>> extends Struct({
  value: Field
}) {
  public abstract numBits(): number;

  protected static readonly assertionFunction: (
    bool: Bool,
    msg?: string
  ) => void = assert;

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
   * Creates a {@link UIntX} with a value of 18,446,744,073,709,551,615.
   */
  protected static maxIntField(numBits: number): Field {
    return Field((1n << BigInt(numBits)) - 1n);
  }

  // public readonly NUM_BITS: number;

  protected constructor(
    value: Field,
    private readonly impls: {
      creator: (value: Field) => This;
      from: (value: Field | This | bigint | number | string) => This;
    }
  ) {
    super({ value });

    const bits = this.numBits();
    if (bits % 16 !== 0) {
      throw errors.canOnlyCreateMultiplesOf16Bits();
    }

    if (bits === 256) {
      throw errors.usageWith256BitsForbidden();
    }
  }

  /**
   * Turns the {@link UIntX} into a string.
   * @returns
   */
  public toString() {
    return this.value.toString();
  }

  /**
   * Turns the {@link UIntX} into a {@link BigInt}.
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
  public divMod(divisor: This | bigint | number | string) {
    let x = this.value;
    let divisor_ = this.impls.from(divisor).value;

    if (this.value.isConstant() && divisor_.isConstant()) {
      let xn = x.toBigInt();
      let divisorn = divisor_.toBigInt();
      let q = xn / divisorn;
      let r = xn - q * divisorn;
      return {
        quotient: this.impls.creator(Field(q)),
        rest: this.impls.creator(Field(r)),
      };
    }

    divisor_ = divisor_.seal();

    let q = Provable.witness(
      Field,
      () => new Field(x.toBigInt() / divisor_.toBigInt())
    );

    UIntX.assertionFunction(
      q.rangeCheckHelper(this.numBits()).equals(q),
      "Divison overflowing"
    );

    if (this.numBits() * 2 > 255) {
      // Prevents overflows over the finite field boundary for applicable uints
      divisor_.assertLessThan(x, "Divisor too large");
      q.assertLessThan(x, "Quotient too large");
    }

    // eslint-disable-next-line no-warning-comments
    // TODO: Could be a bit more efficient
    let r = x.sub(q.mul(divisor_)).seal();

    UIntX.assertionFunction(
      r.rangeCheckHelper(this.numBits()).equals(r),
      "Divison overflowing, remainder"
    );

    let r_ = this.impls.creator(r);
    let q_ = this.impls.creator(q);

    UIntX.assertionFunction(
      r_.lessThan(this.impls.creator(divisor_)),
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
   * Implements a non-overflowing square-root with rest.
   * Normal Field.sqrt() provides the sqrt as it is defined by the finite
   * field operations. This implementation however mimics the natural-numbers
   * style of sqrt to be used inside applications with the tradeoff that it
   * also returns a "rest" that indicates the amount the actual result is off
   * (since we floor the result to stay inside the ff).
   *
   * Some assertions are hard-failing, because they represent malicious
   * witness values
   *
   * @returns sqrt: The non-overflowing sqrt
   * @returns rest: The remainder indicating how far off the result
   * is from the "real" sqrt
   */
  public sqrtMod(): { sqrt: This; rest: This } {
    let x = this.value;

    if (x.isConstant()) {
      const xn = x.toBigInt();
      const sqrt = bigintSqrt(xn);
      const rest = xn - sqrt * sqrt;
      return {
        sqrt: this.impls.creator(Field(sqrt)),
        rest: this.impls.creator(Field(rest)),
      };
    }

    const sqrtField = Provable.witness(Field, () => {
      const sqrtn = bigintSqrt(x.toBigInt());
      return Field(sqrtn);
    });

    // Sqrt fits into (NUM_BITS / 2) bits
    sqrtField
      .rangeCheckHelper(this.numBits())
      .assertEquals(sqrtField, "Sqrt output overflowing");

    // Range check included here?
    const sqrt = this.impls.creator(sqrtField);

    const rest = Provable.witness(Field, () => {
      const sqrtn = sqrtField.toBigInt();
      return Field(x.toBigInt() - sqrtn * sqrtn);
    });

    rest
      .rangeCheckHelper(this.numBits())
      .assertEquals(rest, "Sqrt rest output overflowing");

    const square = sqrtField.mul(sqrtField);

    if (this.numBits() * 2 > 255) {
      square.assertGreaterThan(sqrtField, "Sqrt result overflowing");
    }

    const nextSqrt = sqrtField.add(1);
    const nextLargerSquare = nextSqrt.mul(nextSqrt);

    // We assert that the rest is not larger than the minimum it needs to be
    // Therefore we assert that the sqrt is the highest possible candidate
    rest.assertLessThan(
      nextLargerSquare.sub(square),
      "There exists a larger sqrt solution than provided witness"
    );

    // Assert that sqrt*sqrt+rest == x
    x.assertEquals(square.add(rest), "Square evaluation failed");

    return {
      sqrt,
      rest: this.impls.creator(rest),
    };
  }

  /**
   * Wraps sqrtMod() by only returning the sqrt and omitting the rest field.
   */
  public sqrtFloor(): This {
    return this.sqrtMod().sqrt;
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
    let yField = this.impls.from(y).value;
    let z = this.value.mul(yField);

    if (this.numBits() * 2 > 255) {
      // Only one should be enough
      z.assertGreaterThan(this.value, "Multiplication overflowing");
    }

    UIntX.assertionFunction(
      z.rangeCheckHelper(this.numBits()).equals(z),
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
      z.rangeCheckHelper(this.numBits()).equals(z),
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
      z.rangeCheckHelper(this.numBits()).equals(z),
      "Subtraction overflow"
    );
    return this.impls.creator(z);
  }

  /**
   * Checks if a {@link UIntX} is less than or equal to another one.
   */
  public lessThanOrEqual(y: This) {
    if (this.value.isConstant() && y.value.isConstant()) {
      return Bool(this.value.toBigInt() <= y.value.toBigInt());
    }
    let xMinusY = this.value.sub(y.value).seal();
    let yMinusX = xMinusY.neg();
    let yMinusXFits = yMinusX.rangeCheckHelper(this.numBits()).equals(yMinusX);
    let xMinusYFits = xMinusY.rangeCheckHelper(this.numBits()).equals(xMinusY);
    UIntX.assertionFunction(xMinusYFits.or(yMinusXFits));
    // x <= y if y - x fits in 64 bits
    return yMinusXFits;
  }

  /**
   * Asserts that a {@link UIntX} is less than or equal to another one.
   */
  public assertLessThanOrEqual(y: This, message?: string) {
    if (this.value.isConstant() && y.value.isConstant()) {
      let x0 = this.value.toBigInt();
      let y0 = y.value.toBigInt();
      if (x0 > y0) {
        if (message !== undefined) {
          throw new Error(message);
        }
        throw new Error(`UIntX.assertLessThanOrEqual: expected ${x0} <= ${y0}`);
      }
      return;
    }
    let yMinusX = y.value.sub(this.value).seal();
    UIntX.assertionFunction(
      yMinusX.rangeCheckHelper(this.numBits()).equals(yMinusX),
      message
    );
  }

  /**
   *
   * Checks if a {@link UIntX} is less than another one.
   */
  public lessThan(y: This) {
    return this.lessThanOrEqual(y).and(this.value.equals(y.value).not());
  }

  /**
   * Asserts that a {@link UIntX} is less than another one.
   */
  public assertLessThan(y: This, message?: string) {
    UIntX.assertionFunction(this.lessThan(y), message);
  }

  /**
   * Checks if a {@link UIntX} is greater than another one.
   */
  public greaterThan(y: This) {
    return y.lessThan(this);
  }

  /**
   * Asserts that a {@link UIntX} is greater than another one.
   */
  public assertGreaterThan(y: This, message?: string) {
    y.assertLessThan(this, message);
  }

  /**
   * Checks if a {@link UIntX} is greater than or equal to another one.
   */
  public greaterThanOrEqual(y: This) {
    return this.lessThan(y).not();
  }

  /**
   * Asserts that a {@link UIntX} is greater than or equal to another one.
   */
  public assertGreaterThanOrEqual(y: This, message?: string) {
    y.assertLessThanOrEqual(this, message);
  }

  /**
   * Turns the {@link UIntX} into a {@link UInt64}, asserting that it fits in 32 bits.
   */
  public toUInt64() {
    let uint64 = new UInt64(this.value);
    UInt64.check(uint64);
    return uint64;
  }

  /**
   * Turns the {@link UIntX} into a {@link UInt64}, clamping to the 64 bits range if it's too large.
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
