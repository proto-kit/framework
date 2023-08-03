import { Field, Poseidon, Struct, UInt64 } from "snarkyjs";

export class CurrentBlock extends Struct({
  height: UInt64,
}) {}

export class NetworkState extends Struct({
  block: CurrentBlock,
}) {
  public hash(): Field {
    return Poseidon.hash([
      ...CurrentBlock.toFields(this.block)
    ])
  }
}
