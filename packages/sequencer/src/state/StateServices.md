## State Service Architecture

The state services are built using a abstraction stack, where every service that is below the root is based on the parent.
All of this services have the ability to base off one another to allow for diff-based changes.
You can think of it a bit like git, where every commit is only the diff between the parents state and the next state.

*But*, in this architecture there is no such thing as branching, it is strictly linear and behaves almost like a traditional stack.
That means, for example, that you shouldn't change state in a service that has one or more children, as these changes might not get reflected instantly in the children's perception of state.

Now I will go over all the different kinds of stateservices

Btw all of this also applies to to merkle tree stores

### AsyncStateService

This is always the base for the whole stack and is meant to be implemented by the actual persistence layer. 
That means primarily the DB (but is also implemented by the in-memory state service).
It's functions are async-based in order to enable external DB APIs

### CachedStateService

It receives a AsyncStateService as a parent and can build on top of it.
It "caches" in the sense that it can preload state entries from the parent (asynchronously) and then lets circuits among others perform synchronous operations on them.
It additionally caches write operations that can then later be merged back into the parent (or thrown away). 

### SyncCachedStateService

These are the same as CachedStateService, with the difference that it accepts a CachedStateService and requires no preloading.

### PreFilledStateService

Pre-filled with only a part of the data needed. This is mostly used in Task implementation where all state needed is passed as args.