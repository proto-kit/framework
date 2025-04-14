import { LinkedLeafStore, LinkedLeaf } from "./LinkedLeafStore";

export class InMemoryLinkedLeafStore implements LinkedLeafStore {
  public leaves: {
    [key: string]: { leaf: LinkedLeaf; index: bigint };
  } = {};

  public maximumIndex?: bigint;

  public getLeaf(
    path: bigint
  ): { leaf: LinkedLeaf; index: bigint } | undefined {
    return this.leaves[path.toString()];
  }

  public setLeaf(index: bigint, value: LinkedLeaf): void {
    const leaf = this.getLeaf(value.path);

    if (leaf !== undefined && leaf?.index !== index) {
      throw new Error("Cannot change index of existing leaf");
    }

    this.leaves[value.path.toString()] = { leaf: value, index: index };
    if (index > (this.maximumIndex ?? -1)) {
      this.maximumIndex = index;
    }
  }

  public getMaximumIndex(): bigint | undefined {
    return this.maximumIndex;
  }

  // This gets the leaf with the closest path.
  public getPreviousLeaf(
    path: bigint
  ): { leaf: LinkedLeaf; index: bigint } | undefined {
    return Object.values(this.leaves).find(
      (storedLeaf) =>
        storedLeaf.leaf.nextPath > path && storedLeaf.leaf.path < path
    );
  }
}
