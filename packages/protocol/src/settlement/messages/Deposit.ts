import { Field, PublicKey, Struct, UInt64 } from "o1js";

export class Deposit extends Struct({
  tokenId: Field,
  address: PublicKey,
  amount: UInt64,
}) {}
