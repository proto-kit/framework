import { Field } from "o1js";
import { LinkedLeafStruct, log } from "@proto-kit/common";

import { AsyncLinkedLeafStore } from "../src/state/async/AsyncLinkedLeafStore";

export namespace LinkedMerkleTreeIntegrity {
  export async function checkIntegrity(store: AsyncLinkedLeafStore) {
    log.info("Checking tree integrity...");

    let currentPath = 0n;
    const maxPath = Field.ORDER - 1n;

    while (currentPath < maxPath) {
      const leaves = await store.getLeavesAsync([currentPath]);
      if (leaves.length === 0 || leaves[0] === undefined) {
        return false;
      }

      const leaf = leaves[0]!;

      const treeValues = await store.treeStore.getNodesAsync([
        { level: 0, key: leaf.index },
      ]);
      if (treeValues.length === 0 || treeValues[0] === undefined) {
        return false;
      }

      const treeValue = treeValues[0];
      const leafHash = new LinkedLeafStruct(
        LinkedLeafStruct.fromValue(leaf.leaf)
      )
        .hash()
        .toBigInt();

      if (treeValue !== leafHash) {
        return false;
      }
      if (leaf.leaf.nextPath <= currentPath) {
        return false;
      }

      currentPath = leaf.leaf.nextPath;
    }
    return true;
  }
}
