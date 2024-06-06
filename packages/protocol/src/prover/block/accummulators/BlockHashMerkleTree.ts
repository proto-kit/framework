import { createMerkleTree } from "@proto-kit/common";
import { Bool, Field, Poseidon, Struct } from "o1js";

export class BlockHashMerkleTree extends createMerkleTree(40) {}
export class BlockHashMerkleTreeWitness extends BlockHashMerkleTree.WITNESS {}

export class BlockHashTreeEntry extends Struct({
  blockHash: Field,
  closed: Bool,
  // TODO We could add startingEternalTransactionsHash here to offer
  // a more trivial connection to the sequence state
}) {
  public hash(): Field {
    return Poseidon.hash([this.blockHash, ...this.closed.toFields()]);
  }
}
