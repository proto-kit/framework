## Block Hooks and Network State

For our current architecture, network state is very loosely embedded into the provers and follows no pre-defined flow.
That is because we don't have a concept of a "block" inside our provers, only transaction batches.
So in order to give the user this notion of a "block", we have to enforce it through custom logic.

## From and to network state

Network state is the underlying principle that allows us to access some kind of global immutable state inside our runtime, that is somehow
provided from the outside and follows rules that somehow rely on verification on the settlement layer.
In order to transition between sub-states intra-batch, we have a *from* and a *to* network state that are hashed and encoded inside the proofs public input.

# Hooks

We implement two different types of hooks

`beforeBundle()` - will be executed at the start of a bundle
`afterBundle()` - will be executed after the end of a bundle

Currently, they receive as parameters:
- The current NetworkState
- THe current state of the blockprover including stateRoot and transactionsHash

Both hooks have one responsibility: 
Mutate an input NetworkState to a new NetworkState.
i.e. `(NetworkState, prover_data) => NetworkState`

The resulting NetworkState will subsequently be used by the next bundle.
Obviously, beforeBundle() will receive the result of the prior afterBundle().

## How do we decide when to execute a hook?

We want to execute the beforeBundle hook when `currentTransactionsHash == Field(0)`
and the afterBundle hook only in a provable action that closes the bundle (i.e. doesn't allow any further additions to it).

This however needs the bundles encoded as a merkletree, which is going to be done in future work.
Currently, the opening and closing can be performed arbitrarily by the sequencer through the indication of the `BundlePositionType`.
- "First" -> beforeBundle()
- "Middle" -> -
- "Last" -> afterBundle()

## Why the seperation in before and after hooks?

In order for the networkstate to incorporate information about the last completed bundle, we need to compute the result in the prior block.
This is because we have no access to the previous bundle in the next block and therefore can't make assertions about it.

## Future TODOs:
- Make the NetworkState struct configurable through modularity
- Encode the bundle[] as a merkletree parallel to encoding as hashlist