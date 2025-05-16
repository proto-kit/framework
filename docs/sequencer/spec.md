## Merkle Tree Stores

Object we need to store:
(Nodes, Leaves, MaximumIndex)

Level 1:
Async stores: (InMemory*, Redis*)

Schema:
Record<path, { leaf, index }> 

write<object>
get<object>Async
getMaximumIndexAsync
getLeafLessOrEqualAsync(path) (gives us either our current leaf or previous leaf in case of insert)

openTransaction()
commit()

( getLeafByIndex )

Level 2:
CachedStore: implements Sync, parent: Async

Sync:
set<object>
getNode
getLeaf(path) => { leaf: LinkedLeaf, index: bigint }
getMaximumIndex
getLeafLessOrEqual(path) => { leaf: LinkedLeaf, index: bigint }

Cached:
preloadMerkleWitness(index)
preloadKeys(paths: string[])
mergeIntoParent()

Level 3:
SyncCachedStore: implements Sync, parent: Sync
mergeIntoParent()

preLoading:
input: path
```
const leaf = parent.getLeaf(path)
if(leaf !== undefined) {
  super.cache(leaf);
  // Update
  preloadMerkleWitness(leaf.index);
} else {
  // Insert
  const previousLeaf = parent.getLeafLessOrEqual(path);
  super.cache(previousLeaf);
  preloadMerkleWitness(previousLeaf.index);
  const maximumIndex = this.preloadAndGetMaximumINndex(); // super.getMaximumINdex() ?? await parent.getMaximumIndexASync()
  preloadMerkleWitness(maximumIndex);
}

```

Sync interface:
Union of LinkedMerkleTreeStore (rename to LinkedLeafStore) + MerkleTreeStore

Async
Level 1 methods

InMemoryLeafStore - subset that does leafs + maximumindex
InMemoryMerkleStore - subset that does only merkle nodes

-> future Redis

InMemoryAsyncLinkedMerkleTreeStore - implements Async 
uses inmemory implementations




