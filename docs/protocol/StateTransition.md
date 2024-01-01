# State Transition

A StateTransition has 3 properties.
First is the path, a Field element and identifying the storage slot that this transition is targeting.

Then we have two Options, for the `from` and `to` transition.

## Option

- `isSome`: Indicates whether the `value` of this transition should be enforced.
If the option is in `from`, it indicates whether the precondition should be enforced or not
If the option is in `to`, it indicated whether the `value` should be written to the tree or skipped

- `value`: A Provable object that should be stored or preconditioned
- `enforceEmpty`:


# Provable STs & Options

The provable STs and Option variants contain the semantics of the original (non-provable) objects,
but normalize them to a format that is usable in the state tree. 
This means that the `value` will be hashed into a single field element and there exists no `isForcedSome` in this context.

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