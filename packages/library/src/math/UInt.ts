// eslint-disable-next-line max-len
import { TypedClass } from "@proto-kit/common";
/* eslint-disable @typescript-eslint/no-magic-numbers,prefer-const,id-length,no-underscore-dangle,putout/putout */
import { Bool, Field, Provable, Struct, UInt32, UInt64 } from "o1js";
import { assert, ReturnType } from "@proto-kit/protocol";
// @ts-ignore
import bigintSqrt from "bigint-isqrt";
import { UInt64 as o1UInt64 } from "o1js/dist/node/lib/int";

const errors = {
  usageWith256BitsForbidden: () =>
    new Error(
      "Usage with 256 bits forbidden, this would lead to unexpected behaviour"
    ),
  canOnlyCreateMultiplesOf16Bits: () =>
    new Error("Can only create rangechecks for multiples of 16 bits"),
};

// export interface UIntXClass extends Struct<{ value: Field }>{
//   new(...args: any[]): {
//     numBits(): number
//   }
// }

export function createUIntX(bits: number) {
  return class UIntX extends Struct({
    value: Field,
  }) {
    public numBits() {
      return bits;
    }

    public static readonly assertionFunction: (
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

    public static check(x: { value: Field }) {
      const actual = x.value.rangeCheckHelper(UInt64.NUM_BITS);
      UIntX.assertionFunction(actual.equals(x.value));
    }

    public static from(
      x: Field | UInt32 | o1UInt64 | UIntX | bigint | number | string
    ): UIntX {
      if (x instanceof UIntX || x instanceof UInt32 || x instanceof o1UInt64) {
        x = x.value;
      }
      return new UIntX(UIntX.checkConstant(Field(x), bits));
    }

    /**
     * Creates a {@link UIntX} with a value of 18,446,744,073,709,551,615.
     */
    public static maxIntField(numBits: number): Field {
      return Field((1n << BigInt(numBits)) - 1n);
    }

    public static MAXINT(): UInt64 {
      return new UInt64(UIntX.maxIntField(UInt64.NUM_BITS));
    }

    // public readonly NUM_BITS: number;

    public constructor(value: Field | { value: Field }) {
      const isValueObject = function (
        v2: Field | { value: Field }
      ): v2 is { value: Field } {
        return value["value"] !== undefined;
      };

      const valueAsField = isValueObject(value) ? value.value : value;
      super({ value: valueAsField });

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
    public divMod(divisor: UIntX | bigint | number | string) {
      let x = this.value;
      let divisor_ = UIntX.from(divisor).value;

      if (this.value.isConstant() && divisor_.isConstant()) {
        let xn = x.toBigInt();
        let divisorn = divisor_.toBigInt();
        let q = xn / divisorn;
        let r = xn - q * divisorn;
        return {
          quotient: new UIntX(Field(q)),
          rest: new UIntX(Field(r)),
        };
      }

      divisor_ = divisor_.seal();

      UIntX.assertionFunction(divisor_.equals(0).not(), "Division by 0");

      let q = Provable.witness(Field, () => {
        const divisorInt = divisor_.toBigInt();
        return new Field(x.toBigInt() / (divisorInt == 0n ? 1n : divisorInt));
      });

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

      let r_ = new UIntX(r);
      let q_ = new UIntX(q);

      UIntX.assertionFunction(
        r_.lessThan(new UIntX(divisor_)),
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
    public div(y: UIntX | bigint | number): UIntX {
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
    public sqrtMod(): { sqrt: UIntX; rest: UIntX } {
      let x = this.value;

      if (x.isConstant()) {
        const xn = x.toBigInt();
        const sqrt = bigintSqrt(xn);
        const rest = xn - BigInt(sqrt * sqrt);
        return {
          sqrt: new UIntX(Field(sqrt)),
          rest: new UIntX(Field(rest)),
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
      const sqrt = new UIntX(sqrtField);

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
        rest: new UIntX(rest),
      };
    }

    /**
     * Wraps sqrtMod() by only returning the sqrt and omitting the rest field.
     */
    public sqrtFloor(): UIntX {
      return this.sqrtMod().sqrt;
    }

    /**
     * Integer remainder.
     *
     * `x.mod(y)` returns the value `z` such that `0 <= z < y` and
     * `x - z` is divisble by `y`.
     */
    public mod(y: UIntX | bigint | number) {
      return this.divMod(y).rest;
    }

    /**
     * Multiplication with overflow checking.
     */
    public mul(y: UIntX | bigint | number) {
      let yField = UIntX.from(y).value;
      let z = this.value.mul(yField);

      if (this.numBits() * 2 > 255) {
        // Only one should be enough
        z.assertGreaterThan(this.value, "Multiplication overflowing");
      }

      UIntX.assertionFunction(
        z.rangeCheckHelper(this.numBits()).equals(z),
        "Multiplication overflowing"
      );
      return new UIntX(z);
    }

    /**
     * Addition with overflow checking.
     */
    public add(y: UIntX | bigint | number) {
      let z = this.value.add(UIntX.from(y).value);
      UIntX.assertionFunction(
        z.rangeCheckHelper(this.numBits()).equals(z),
        "Addition overflowing"
      );
      return new UIntX(z);
    }

    /**
     * Subtraction with underflow checking.
     */
    public sub(y: UIntX | bigint | number) {
      let z = this.value.sub(UIntX.from(y).value);
      UIntX.assertionFunction(
        z.rangeCheckHelper(this.numBits()).equals(z),
        "Subtraction overflow"
      );
      return new UIntX(z);
    }

    /**
     * Checks if a {@link UIntX} is less than or equal to another one.
     */
    public lessThanOrEqual(y: UIntX) {
      if (this.value.isConstant() && y.value.isConstant()) {
        return Bool(this.value.toBigInt() <= y.value.toBigInt());
      }
      let xMinusY = this.value.sub(y.value).seal();
      let yMinusX = xMinusY.neg();
      let yMinusXFits = yMinusX
        .rangeCheckHelper(this.numBits())
        .equals(yMinusX);
      let xMinusYFits = xMinusY
        .rangeCheckHelper(this.numBits())
        .equals(xMinusY);
      UIntX.assertionFunction(xMinusYFits.or(yMinusXFits));
      // x <= y if y - x fits in 64 bits
      return yMinusXFits;
    }

    /**
     * Asserts that a {@link UIntX} is less than or equal to another one.
     */
    public assertLessThanOrEqual(y: UIntX, message?: string) {
      if (this.value.isConstant() && y.value.isConstant()) {
        let x0 = this.value.toBigInt();
        let y0 = y.value.toBigInt();
        if (x0 > y0) {
          if (message !== undefined) {
            throw new Error(message);
          }
          throw new Error(
            `UIntX.assertLessThanOrEqual: expected ${x0} <= ${y0}`
          );
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
    public lessThan(y: UIntX) {
      return this.lessThanOrEqual(y).and(this.value.equals(y.value).not());
    }

    /**
     * Asserts that a {@link UIntX} is less than another one.
     */
    public assertLessThan(y: UIntX, message?: string) {
      UIntX.assertionFunction(this.lessThan(y), message);
    }

    /**
     * Checks if a {@link UIntX} is greater than another one.
     */
    public greaterThan(y: UIntX) {
      return y.lessThan(this);
    }

    /**
     * Asserts that a {@link UIntX} is greater than another one.
     */
    public assertGreaterThan(y: UIntX, message?: string) {
      y.assertLessThan(this, message);
    }

    /**
     * Checks if a {@link UIntX} is greater than or equal to another one.
     */
    public greaterThanOrEqual(y: UIntX) {
      return this.lessThan(y).not();
    }

    /**
     * Asserts that a {@link UIntX} is greater than or equal to another one.
     */
    public assertGreaterThanOrEqual(y: UIntX, message?: string) {
      y.assertLessThanOrEqual(this, message);
    }

    /**
     * Checks if a {@link UIntX} is equal to another one.
     */
    public equals(y: UIntX | bigint | number): Bool {
      return UIntX.from(y).value.equals(this.value);
    }

    /**
     * Asserts that a {@link UIntX} is equal to another one.
     */
    public assertEquals(y: UIntX | bigint | number, message?: string) {
      UIntX.assertionFunction(this.equals(y), message);
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
        this.greaterThan(UIntX.from(max)),
        UInt64.from(max),
        new UInt64(this.value)
      );
    }
  };
}
