# App modules

- App module equals ZkProgram
- each app module function is a ZkProgram method
- public input of this ZkProgram is a hash of state transitions (stateTransitionsCommitment)
- state & methods are decorated, to distinguish from non-publicly-callable methods
[
- interop between modules, is like copy pasting code from one module to another
- composable modules to be as minimal as possible, so that the users can compose the functionality as they see fit (burnable, mintable, governable, upgradable, ...)
- to override module functionality, you can extend the module class and override .e.g. a method and just return a false status to disable it
- all module methods are merged into an AppChain ZkProgram, this means that the generated StateTransitionProver has to only accept one AppChain proof
]()

TODO:
- user signature auth -> sender signs tx, from === sender -> tx prover checks signature, then state transition is merged with tx prover into a block proof
    - each method invocation should have transaction/invocation commitment checking the method name + parameterrs provided match what the transaction specified - which is authorized & proven separately but then converged via the commitment
    - tx status should be also public input, not private return?
- mempool bundle sequence hash
- tx fees
    - expensiveness of each method proving
    - no fees is an option as well
    - flat fee
    - since we have instant inclusion signatures, there is effectively no fee market
    - fees are deducted from L2 balances
    - you can pay the fee in 1, or different assets
        - either at fix conversion rate / spot price
        - or at an oracle price
          TODO: find a way where to create and apply state transitions for paying fees
- batch tx? (!)
  -> have a batch of Tx, if any of them has result: false, then dont apply state transitions
- accepting local proofs, privacy by having data accross multiple providers, so you can fetch a witness and submit a proof, without the sequencer knowing what witness you were asking for?
  -> how does this fit into the tx commitment scheme?
  -> proof's public input is made part of the transaction arguments, so it can be enforced within the tx execution circuit


# Blocks & Transaction

- No bundle proof, we only construct a transactionListCommitment at the will of the operator, from the mempool
- BlockProof that verifies the signature of the processed transaction, while it also merges the proof of tx execution (AppChainProof) and proof of applying all state transitions, resulting from each individual tx
    - BlockProof is a rolling proof, and its only considered valid once its 'sealed' a.k.a. rolled up to completion - it rolled up all the required transactions (transaction commitments)
    - BlockProof has to be signed by the sequencer operator to be considered valid by the L1

- sequencer can issue transaction inclusion signatures, threfore the users can dispute / stop the app chain in case their transaction is not included

## Inclusion signatures

instant 1x transaction inclusion via tx queues -> signed for inclusion
-> users can dispute / stop the app chain, in case their tx is not included in the block proof on the l1

-> mode of punishment for the seuqencer -> turn off app chain, or slash stake
-> how is the inclusion disputed on the L1? one way could be to store a history of block public inputs in the l1 state



# State

# getting
- property key -> unicode -> Field[] -> single Field hash
- Single 256 merkle map for the entire app chain, no sub trees!
    - its mathematically impossible to get a collision since we prefix the keys to be unique
- .get() & .getOrDefault(), or provide a default at the state definition, prevent implicit behaviors as much as possible, but dont compromise the developer experience
- Not just getOrDefault, but we could wrap everything in Option (we should)
- getting a value produces a StateTransition, where the 'to' is a None
    - (applies for first time .set()) for a case where the state did not exist before, the 'from' is a None instead ?? or Some with value: Field(0)

- exists() -> Field(0) -> None vs hash([Field(0)]) -> Some(Field(0))
    - exists()/get() creates a precondition through 'from' in the StateTransition


# setting
- each .set() call will produce 1 StateTransition
- a StateTranstion looks like this:
  { path: Field[], from: Option<Field>, to: Option<Field> }