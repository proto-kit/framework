# State Transition

A StateTransition has 3 properties.
First is the path, a Field element and identifying the storage slot that this transition is targeting.

Then we have two Options, for the `from` and `to` transition.

## Option

- `isSome`: Indicates whether the `value` of this transition should be enforced.
If the option is in `from`, it indicates whether the precondition should be enforced or not
If the option is in `to`, it indicated whether the `value` should be written to the tree or skipped

- `value`: A Provable object that should be stored or preconditioned

- `enforceEmpty`: This value can be true if the value contains a dummy value and means "this option wants to enforce that the tree value is empty (i.e. 0)".
So there can be two cases:
  (isSome: true, value: [0, 0, ...], enforceEmpty: false) - this checks that the tree value is hash([0, 0]), so the state has saved the value 0.
  (isSome: true, value: [0, 0, ...], enforceEmpty: true) - this checks that the tree value is 0, so the state is empty.


# Provable STs & Options

The provable STs and Option variants contain the semantics of the original (non-provable) objects,
but normalize them to a format that is usable in the state tree. 
This means that the `value` will be hashed into a single field element and there exists no `enforceEmpty` in this context.

#### Examples:

**from:**

Examples show the mapping of Option -> ProvableOption

```
{ isSome: true, value: [1], enforceEmpty: false }
-> 
{ isSome: true, value: hash([1]) }
```

```
{ isSome: true, value: [0], enforceEmpty: false }
-> 
{ isSome: true, value: hash([0]) }
```

```
{ isSome: true, value: [0], enforceEmpty: true }
-> 
{ isSome: true, value: 0 }
```

```
{ isSome: false, value: [1], enforceEmpty: false }
-> 
{ isSome: false, value: hash([1]) }
```

**to:**

For to-Options, enforceEmpty will never be set to `true`