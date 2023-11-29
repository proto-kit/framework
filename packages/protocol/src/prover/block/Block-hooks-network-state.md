## Block Hooks and Network State

For our current architecture, network state is very loosely embedded into the provers and follows no pre-defined flow.
That is because we don't have a concept of a "block" inside our provers, only transaction batches.
So in order to give the user this notion of a "block", we have to enforce it through custom logic.

## From and to network state

Network state is the underlying principle that allows us to access some kind of global immutable state inside our runtime, that is somehow
provided from the outside and follows rules that somehow rely on verification on the settlement layer.
In order to transition between sub-states intra-batch, we have a *from* and a *to* network state that are hashed and encoded inside the proofs public input.

To maintain flexibility, network state parameters will be supplied by the sequencer and the full state will then be produced in-circuit.

# Hooks

We implement two different types of hooks

`beforeBundle()`
`afterBundle()`

Currently, they receive as parameters:
- The current NetworkState
- THe current state of the blockprover including stateRoot and transactionsHash