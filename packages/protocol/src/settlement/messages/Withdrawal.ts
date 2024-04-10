import { PublicKey, Struct, UInt64 } from "o1js";
import { EMPTY_PUBLICKEY } from "@proto-kit/common";

export class Withdrawal extends Struct({
  address: PublicKey,
  amount: UInt64,
}) {
  public static dummy() {
    return new Withdrawal({
      address: EMPTY_PUBLICKEY,
      amount: UInt64.from(0),
    });
  }
}
