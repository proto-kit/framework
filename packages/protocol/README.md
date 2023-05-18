# YAB: Protocol

Protocol contains to all circuit-aware data types and provers

### StateTransitionProver

The StateTransitionProver takes a list of StateTransitions, checks and proves their precondition and update to the respective merkletree represented by the state root public input.

In the public input, the prover transitions from two fields:

- state root
- transitions hash

The transitions hash is the commitment to a hash list where every state transition gets appended one-by-one.

The StateTransitionsProver batches the application of multiple state transitions together.
If the amount of state transitions if greater than the batch size, the seperate proofs can be merged together.

In the end, the publicInput of the StateTransitionProof should contain the following content:

- `fromTransitionsHash: 0` To prove that all STs have been applied, the transitionsHash must start at zero (i.e. a empty hash list)
- `toTransitionsHash` This value must be the same as the transitionsHash in the AppChainProof to guarantee that all (and same) statetransitions that have been outputted by the AppChain have been applied
- `from- and toStateRoot` These values represent the root of the state tree and will later be stitched together to arrive at the final stateroot for a bundle

### BlockProver

The BlockProver's responsibility is to verify and put together the AppChainProof and StateTransitionProof.
It verifies that the transitionsHash is the same across both proofs and then takes the new state root proved by the STProof.

In the end, the BlockProof proofs that:

- the AppChain has been executed correctly
- the resulting state changes have been applied correctly and fully to the state root

Multiple BlockProofs will then be merged together, signed by the sequencer and published to the base layer.

### RollupMerkleTree

The RollupMerkleTree is a custom merkle tree implementation that supports the injection of a storage adapter.
The interface for that adapter can be found as the interface `MerkleTreeStorage`.

Adapters can implement any storage backend, like In-Memory and Database, and supports a process called "virtualization".
Virtualization is the process of layering different Adapters on top of each other.
For example if I want to simulate some transactions to a merkle tree, I can virtualize a database adapter into a MemoryAdapter.
If I am happy with the result, I can merge the results into the database or, if not, discard them without writing the changes to the database.
