import { UInt } from "./UInt";

type AvailableBitLengths = 32 | 64 | 112 | 224;

type NextLowest<Input extends AvailableBitLengths> = Input extends 224
  ? 112
  : Input extends 112
    ? 64
    : Input extends 64
      ? 32
      : never;

type RecursiveSmaller<Input extends AvailableBitLengths> =
  | Input
  | (NextLowest<Input> extends never
      ? never
      : RecursiveSmaller<NextLowest<Input>>);

/**
 * Type to determine all possible bitlengths of UInts that would fit into
 * a given bitlength without doing additional rangechecks.
 * I.e. FittingUInt<112> = UIntX<32 | 64 | 112>
 */
export type FittingUInt<Input extends number> =
  Input extends AvailableBitLengths
    ? UInt<RecursiveSmaller<Input>>
    : UInt<Input>;
