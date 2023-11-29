import { Field, Poseidon, Struct, UInt64 } from "o1js";

export class CurrentBlock extends Struct({
  height: UInt64,
}) {}

export class NetworkState extends Struct({
  block: CurrentBlock,
}) {
  public hash(): Field {
    return Poseidon.hash(CurrentBlock.toFields(this.block));
  }

  public static empty(){
    return new NetworkState({
      block: {
        height: UInt64.zero,
      },
    })
  }
}
