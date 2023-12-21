import { createMerkleTree } from "@proto-kit/common";
import { Bool, Field, Poseidon, Provable, Struct } from "o1js";

export class BlockHashMerkleTree extends createMerkleTree(8) {}
export class BlockHashMerkleTreeWitness extends BlockHashMerkleTree.WITNESS {}

export class BlockHashTreeEntry extends Struct({
  transactionsHash: Field,
  closed: Bool,
}) {
  private hash(): Field {
    return Poseidon.hash([this.transactionsHash, ...this.closed.toFields()]);
  }

  /**
   * @param canBeZero Toggles whether transactionsHash has the possibility to
   * be zero or not. Because of this, we can save the Provable.if() constraints
   * if we don't need it
   */
  public treeValue(canBeZero = true) {
    const hash = this.hash();
    if (canBeZero) {
      // Return Field(0) if the block is empty so far, hash otherwise
      return Provable.if(
        this.transactionsHash.equals(Field(0)),
        Field(0),
        hash
      );
    } else {
      return hash;
    }
  }
}
