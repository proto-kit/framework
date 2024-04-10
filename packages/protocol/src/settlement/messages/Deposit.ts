import { PublicKey, Struct, UInt64 } from "o1js";

export class Deposit extends Struct({
  address: PublicKey,
  amount: UInt64,
}) {}
