import { createMerkleTree } from "@proto-kit/common";
import {
  Bool,
  Field,
  InferJson,
  Poseidon,
  Struct,
} from "o1js";

export class BlockHashMerkleTree extends createMerkleTree(40) {}
export class BlockHashMerkleTreeWitness extends BlockHashMerkleTree.WITNESS {}

export class BlockHashTreeEntry extends Struct({
  block: Struct({
    index: Field,
    transactionListHash: Field,
  }),
  closed: Bool,
  // TODO We could add startingEternalTransactionsHash here to offer
  //  a more trivial connection to the sequence state
}) {
  public hash(): Field {
    // Mirroring Block.hash()
    const blockHash = Poseidon.hash([
      this.block.index,
      this.block.transactionListHash,
    ]);
    return Poseidon.hash([blockHash, ...this.closed.toFields()]);
  }
}
export type BlockHashMerkleTreeWitnessJson = InferJson<typeof BlockHashMerkleTreeWitness>;
