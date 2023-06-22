## Task framework

### Specification

This section will outline what data is transmitted via the message queues and how they should be interpreted

All objects confine to the schema:

```
TaskPayload: {
  name: string // The "operation name"
  payload: string // The data that is transmitted, i.e. inputs and results, JSON encoded
}
```

These objects are used for both master -> worker and worker -> master communication, in the following called "task-input" and "task-results".

The operation name is a indicator for how the input/result data should be interpreted. For this there are currently two methods:

- `taskName`: A "mapping" step
- `taskName + "_reduce"`: A "reduce" step

The taskName is provided via Task.name()

In the map-reduce pattern a sample flow would look like:

#### Example

Task: Multiple inputs by 2 and then add them together
Inputs: [1, 2]

Notation: `<taskName>(<payload>)`

```

-> "sum_map(1)"
-> "sum_map(2)"
<- "sum_map(2)"
<- "sum_map(4)"
-> "sum([2, 4])"
<- "sum(6)"

```

### How does that relate to block production?

We dissect the block production problem into multiple smaller problems:

1. Mapping of TX params (called method, arguments, etc.) => RuntimeProof
2. Mapping of StateTransitionParams (merkle witnesses, state values, ...) => StateTransitionProof (STProof)
3. Mapping of [RuntimeProof, StateTransitionProof, BlockProverParams] => BlockProof
4. Reducing of BlockProof[] => BlockProof

We also have few constraints on that:

- 1 RuntimeProof is compatible with exactly 1 STProof
- A BlockProof-Array is implicitly ordered by their from- and to- public inputs.
  Any BlockProof at position n in that ordering can only be merged with the BlockProofs at n-1 or n+1

When we now combine all of these facts, we arrive at the following high-level flow:

- Map Steps 1 & 2
- Pair results into inputs for Step 3
- Map Step 3
- If reductions are possible reduce, until only one Result is left

THe PairingMapReduceTaskRunner implements this behavious
