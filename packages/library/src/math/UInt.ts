// eslint-disable-next-line max-len
/* eslint-disable prefer-const,no-underscore-dangle,no-bitwise,@typescript-eslint/naming-convention */
import {
  Bool,
  Field,
  Provable,
  Struct,
  UInt64 as O1UInt64,
  Gadgets,
} from "o1js";
import { assert } from "@proto-kit/protocol";
// @ts-ignore
import bigintSqrt from "bigint-isqrt";

const errors = {
  usageWith256BitsForbidden: () =>
    new Error(
      "Usage with 256 bits forbidden, this would lead to unexpected behaviour"
    ),
  canOnlyCreateMultiplesOf16Bits: () =>
    new Error("Can only create rangechecks for multiples of 16 bits"),
};

export type UIntConstructor<BITS extends number> = {
  from(x: UInt<BITS> | bigint | number | string): UInt<BITS>;
  check(x: { value: Field }): void;
  get zero(): UInt<BITS>;
  get max(): UInt<BITS>;

  Unsafe: {
    fromField(x: Field): UInt<BITS>;
  };
  Safe: {
    fromField(x: Field): UInt<BITS>;
  };
};

/**
 * UInt is a base class for all soft-failing UInt* implementations.
 * It has to be overridden for every bitlength that should be available.
 *
 * For this, the developer has to create a subclass of UInt implementing the
 * static methods from interface UIntConstructor
 */
export abstract class UInt<BITS extends number> extends Struct({
  value: Field,
}) {
  public static readonly assertionFunction: (bool: Bool, msg?: string) => void =
    (bool, msg) => {
      // const executionContext = container.resolve(RuntimeMethodExecutionContext);
      assert(bool, msg);
    };

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
   * Creates a {@link UInt} with a value of 18,446,744,073,709,551,615.
   */
  public static maxIntField(numBits: number): Field {
    return Field((1n << BigInt(numBits)) - 1n);
  }

  public constructor(value: { value: Field }) {
    super(value);

    const bits = this.numBits();
    if (bits % 16 !== 0) {
      throw errors.canOnlyCreateMultiplesOf16Bits();
    }

    if (bits === 256) {
      throw errors.usageWith256BitsForbidden();
    }

    // this.checkConstant(value.value);
  }

  public abstract numBits(): BITS;

  public abstract constructorReference(): UIntConstructor<BITS>;

  private fromField(value: Field): UInt<BITS> {
    return this.constructorReference().Unsafe.fromField(value);
  }

  private from(value: UInt<BITS> | string | number | bigint): UInt<BITS> {
    return this.constructorReference().from(value);
  }

  /**
   * Turns the {@link UInt} into a string.
   * @returns
   */
  public toString() {
    return this.value.toString();
  }

  /**
   * Turns the {@link UInt} into a {@link BigInt}.
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
  public divMod(divisor: UInt<BITS> | bigint | number | string) {
    let x = this.value;
    let divisor_ = this.from(divisor).value;

    if (this.value.isConstant() && divisor_.isConstant()) {
      let xn = x.toBigInt();
      let divisorn = divisor_.toBigInt();
      let q = xn / divisorn;
      let r = xn - q * divisorn;
      return {
        quotient: this.fromField(Field(q)),
        rest: this.fromField(Field(r)),
      };
    }

    divisor_ = divisor_.seal();

    UInt.assertionFunction(divisor_.equals(0).not(), "Division by 0");

    let q = Provable.witness(Field, () => {
      const divisorInt = divisor_.toBigInt();
      return new Field(x.toBigInt() / (divisorInt === 0n ? 1n : divisorInt));
    });

    UInt.assertionFunction(
      Gadgets.isDefinitelyInRangeN(this.numBits(), q),
      "Divison overflowing"
    );

    if (this.numBits() * 2 > 255) {
      // Prevents overflows over the finite field boundary for applicable uints
      divisor_.assertLessThan(x, "Divisor too large");
      q.assertLessThan(x, "Quotient too large");
    }

    // TODO: Could be a bit more efficient
    let r = x.sub(q.mul(divisor_)).seal();

    UInt.assertionFunction(
      Gadgets.isDefinitelyInRangeN(this.numBits(), r),
      "Divison overflowing, remainder"
    );

    let r_ = this.fromField(r);
    let q_ = this.fromField(q);

    UInt.assertionFunction(
      r_.lessThan(this.fromField(divisor_)),
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
  public div(y: UInt<BITS> | bigint | number): UInt<BITS> {
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
  public sqrtMod(): { sqrt: UInt<BITS>; rest: UInt<BITS> } {
    let x = this.value;

    if (x.isConstant()) {
      const xn = x.toBigInt();
      const sqrt = bigintSqrt(xn);
      const rest = xn - BigInt(sqrt * sqrt);
      return {
        sqrt: this.fromField(Field(sqrt)),
        rest: this.fromField(Field(rest)),
      };
    }

    const sqrtField = Provable.witness(Field, () => {
      const sqrtn = bigintSqrt(x.toBigInt());
      return Field(sqrtn);
    });

    // Sqrt fits into (NUM_BITS / 2) bits
    Gadgets.isDefinitelyInRangeN(this.numBits(), sqrtField).assertTrue(
      "Sqrt output overflowing"
    );

    // Range check included here?
    const sqrt = this.fromField(sqrtField);

    const rest = Provable.witness(Field, () => {
      const sqrtn = sqrtField.toBigInt();
      return Field(x.toBigInt() - sqrtn * sqrtn);
    });

    Gadgets.isDefinitelyInRangeN(this.numBits(), rest).assertTrue(
      "Sqrt rest output overflowing"
    );

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
      rest: this.fromField(rest),
    };
  }

  /**
   * Wraps sqrtMod() by only returning the sqrt and omitting the rest field.
   */
  public sqrtFloor(): UInt<BITS> {
    return this.sqrtMod().sqrt;
  }

  /**
   * Integer remainder.
   *
   * `x.mod(y)` returns the value `z` such that `0 <= z < y` and
   * `x - z` is divisble by `y`.
   */
  public mod(y: UInt<BITS> | bigint | number) {
    return this.divMod(y).rest;
  }

  /**
   * Multiplication with overflow checking.
   */
  public mul(y: UInt<BITS> | bigint | number) {
    let yField = this.from(y).value;
    let z = this.value.mul(yField);

    if (this.numBits() * 2 > 255) {
      // Only one should be enough
      z.assertGreaterThan(this.value, "Multiplication overflowing");
    }

    UInt.assertionFunction(
      Gadgets.isDefinitelyInRangeN(this.numBits(), z),
      "Multiplication overflowing"
    );
    return this.fromField(z);
  }

  /**
   * Addition with overflow checking.
   */
  public add(y: UInt<BITS> | bigint | number) {
    let z = this.value.add(this.from(y).value);
    UInt.assertionFunction(
      Gadgets.isDefinitelyInRangeN(this.numBits(), z),
      "Addition overflowing"
    );
    return this.fromField(z);
  }

  /**
   * Subtraction with underflow checking.
   */
  public sub(y: UInt<BITS> | bigint | number) {
    let z = this.value.sub(this.from(y).value);
    UInt.assertionFunction(
      Gadgets.isDefinitelyInRangeN(this.numBits(), z),
      "Subtraction overflow"
    );
    return this.fromField(z);
  }

  /**
   * Checks if a {@link UInt} is less than or equal to another one.
   */
  public lessThanOrEqual(y: UInt<BITS>) {
    if (this.value.isConstant() && y.value.isConstant()) {
      return Bool(this.value.toBigInt() <= y.value.toBigInt());
    }
    let xMinusY = this.value.sub(y.value).seal();
    let yMinusX = xMinusY.neg();
    let yMinusXFits = Gadgets.isDefinitelyInRangeN(this.numBits(), yMinusX);
    let xMinusYFits = Gadgets.isDefinitelyInRangeN(this.numBits(), xMinusY);
    UInt.assertionFunction(xMinusYFits.or(yMinusXFits));
    // x <= y if y - x fits in 64 bits
    return yMinusXFits;
  }

  /**
   * Asserts that a {@link UInt} is less than or equal to another one.
   */
  public assertLessThanOrEqual(y: UInt<BITS>, message?: string) {
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
    UInt.assertionFunction(
      Gadgets.isDefinitelyInRangeN(this.numBits(), yMinusX),
      message
    );
  }

  /**
   *
   * Checks if a {@link UInt} is less than another one.
   */
  public lessThan(y: UInt<BITS>) {
    return this.lessThanOrEqual(y).and(this.value.equals(y.value).not());
  }

  /**
   * Asserts that a {@link UInt} is less than another one.
   */
  public assertLessThan(y: UInt<BITS>, message?: string) {
    UInt.assertionFunction(this.lessThan(y), message);
  }

  /**
   * Checks if a {@link UInt} is greater than another one.
   */
  public greaterThan(y: UInt<BITS>) {
    return y.lessThan(this);
  }

  /**
   * Asserts that a {@link UInt} is greater than another one.
   */
  public assertGreaterThan(y: UInt<BITS>, message?: string) {
    y.assertLessThan(this, message);
  }

  /**
   * Checks if a {@link UInt} is greater than or equal to another one.
   */
  public greaterThanOrEqual(y: UInt<BITS>) {
    return this.lessThan(y).not();
  }

  /**
   * Asserts that a {@link UInt} is greater than or equal to another one.
   */
  public assertGreaterThanOrEqual(y: UInt<BITS>, message?: string) {
    y.assertLessThanOrEqual(this, message);
  }

  /**
   * Checks if a {@link UInt} is equal to another one.
   */
  public equals(y: UInt<BITS> | bigint | number): Bool {
    return this.from(y).value.equals(this.value);
  }

  /**
   * Asserts that a {@link UInt} is equal to another one.
   */
  public assertEquals(y: UInt<BITS> | bigint | number, message?: string) {
    UInt.assertionFunction(this.equals(y), message);
  }

  /**
   * Turns the {@link UInt} into a o1js {@link UInt64}, asserting that it fits in 32 bits.
   */
  public toO1UInt64() {
    let uint64 = O1UInt64.Unsafe.fromField(this.value);
    O1UInt64.check(uint64);
    return uint64;
  }

  /**
   * Turns the {@link UInt} into a o1js {@link UInt64},
   * clamping to the 64 bits range if it's too large.
   */
  public toO1UInt64Clamped() {
    if (this.numBits() <= 64) {
      return O1UInt64.Unsafe.fromField(this.value);
    }
    let max = (1n << 64n) - 1n;
    return Provable.if(
      // We know that BITS is >64 bits, so we can skip range checks for max
      this.greaterThan(this.fromField(Field(max))),
      O1UInt64.from(max),
      O1UInt64.Unsafe.fromField(this.value)
    );
  }
}
// eslint-disable-next-line max-len
/* eslint-enable prefer-const,no-underscore-dangle,no-bitwise,@typescript-eslint/naming-convention */
