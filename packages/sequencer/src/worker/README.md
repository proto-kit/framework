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

- `taskName`: A "reduce" step
- `taskName + "_map"`: A "mapping" step

The taskName is provided via Task.name()

In the map-reduce pattern a sample flow would look like:

#### Example

Task: Multiple inputs by 2 and then add them together
Inputs: [1, 2]

```

-> "sum_map(1)"
-> "sum_map(2)"
<- "sum_map(2)"
<- "sum_map(4)"
-> "sum([2, 4])"
<- "sum(6)"

```
