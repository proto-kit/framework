import { Field, PublicKey, Struct, UInt64 } from "o1js";
import { EMPTY_PUBLICKEY } from "@proto-kit/common";

export class Withdrawal extends Struct({
  tokenId: Field,
  address: PublicKey,
  amount: UInt64,
}) {
  public static dummy() {
    return new Withdrawal({
      tokenId: Field(0),
      address: EMPTY_PUBLICKEY,
      amount: UInt64.from(0),
    });
  }
}
