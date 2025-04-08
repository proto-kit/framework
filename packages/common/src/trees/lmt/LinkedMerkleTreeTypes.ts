import { Bool, Field, Poseidon, Provable, Struct } from "o1js";

export class LinkedLeafStruct extends Struct({
  value: Field,
  path: Field,
  nextPath: Field,
}) {
  public isDummy() {
    return this.path.equals(0).and(this.nextPath.equals(0));
  }

  public hash(): Field {
    const hash = Poseidon.hash(LinkedLeafStruct.toFields(this));
    return Provable.if(this.isDummy(), Field(0), hash);
  }

  public static dummy(): LinkedLeafStruct {
    return new LinkedLeafStruct({
      value: Field(0),
      path: Field(0),
      nextPath: Field(0),
    });
  }
}

export class LinkedMerkleTreeGlobalState extends Struct({
  root: Field,
  lastOccupiedIndex: Field,
}) {
  public static equals(
    state1: LinkedMerkleTreeGlobalState,
    state2: LinkedMerkleTreeGlobalState
  ): Bool {
    return state1.root
      .equals(state2.root)
      .and(state1.lastOccupiedIndex.equals(state2.lastOccupiedIndex));
  }

  public static assertEquals(
    state1: LinkedMerkleTreeGlobalState,
    state2: LinkedMerkleTreeGlobalState,
    msg?: string
  ) {
    state1.root.assertEquals(
      state2.root,
      msg !== undefined ? `${msg}: root` : msg
    );
    state1.lastOccupiedIndex.assertEquals(
      state2.lastOccupiedIndex,
      msg !== undefined ? `${msg}: lastOccupiedIndex` : msg
    );
  }
}
