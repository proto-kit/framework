// import {
//   CachedMerkleTreeStore,
//   MockAsyncMerkleTreeStore,
// } from "@proto-kit/sequencer";
import { RollupMerkleTree } from "../src";
import { Field, Poseidon } from "o1js";

describe("merkle tree calc test", () => {
  // it("bench", async () => {
  //   const merklestore = new CachedMerkleTreeStore(
  //     new MockAsyncMerkleTreeStore()
  //   );
  //   const tree = new RollupMerkleTree(merklestore);
  //
  //   console.log(tree.getRoot().toString());
  //
  //   let start = Date.now();
  //   tree.setLeaf(5n, Field(5));
  //   console.log("setting leaf took", Date.now() - start, "ms");
  //
  //   start = Date.now();
  //   tree.setLeaf(42624747n, Field(5));
  //   console.log("setting leaf took", Date.now() - start, "ms");
  // });
  it("bench2", async () => {
    Poseidon.hash([Field(132), Field(1)]);
    let start = Date.now();

    for (let i = 0; i < 256; i++) {
      Poseidon.hash([Field(i), Field(i + 1)]);
    }

    console.log("setting leaf took", Date.now() - start, "ms");
  });
});
