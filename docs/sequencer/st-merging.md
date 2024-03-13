# State Transition merging

Runtimes emit seperate STs for get() and set() calls.
So for a typical chain of a .get() and .set() for path p, the emitted STs would look like:
{ path: p, from: { isSome: true, value: 5 }, to: { isSome: false, value: 0 } }
{ path: p, from: { isSome: true, value: 5 }, to: { isSome: true, value: 10 } }

These two STs can be merged into one by using the first occurring from option, and the last to option that is some.
We have to assert that both the paths match and the values match. 
That meaning that the intermediate values are consistent across that set of STs.

### Implementation

There are fundamentally two ways to implement this:
Static merging and dynamic merging.
Static merging is baked into the circuit and relies on a certain key to be the same across all possible executions of the circuit.
It is way less flexible and the results are sometimes not optimal, especially if we think into the direction of dynamic keys.

Therefore, we go for dynamic merging, where we determine their reducability at runtime as a generic circuit function.
The way this works is that push STs onto the stack and remember the value of the latest one together with it's preimage.
(Remember, `commitment = hash(preimage, ...value)`).
And then, for every new value we do the reduction, and if a reduction is possible, 
we "pop" the value from the list again and push only the merged ST on the list by using the previously saved preimage.
`commitment = hash(preimage, ...mergedST)`

We implement it only on the level of ProvableStateTransitions and offer utils to filter a normal StateTransition list too to match the calculated hashlist commitment.

Important to note is that the reduction happens twice:
1. in-ciruit: In the runtimeMethod wrapper (& BlockProver) after executing the circuit, where we retrieve the ST[] and reduce it provably, so that we create the reduced stateTransitionsList commitement for the publicOutput
2. out-of-circuit: In the Execution & Tracing service. We do the multi-round simluation normally, but after we got the correct ST[], we run the reduction and use that going forward

### Reference

`StateTransitionReductionList`
Provable implementation of pushing reducable Statetransitions.
To be used in-circuit to get a reduced hashlist commitment

`reduce`