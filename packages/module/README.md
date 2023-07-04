# YAB: Module

Set of APIs to define YAB runtime modules and application chains.

**Application chain** consists of multiple _runtime modules_. Runtime modules can be either implemented as part of the chain directly, or imported from 3rd parties. Here's an example of how a chain with two runtime modules can be defined:

```typescript
const chain = Chain.from({
  state: new InMemoryStateService(),
  // specify which modules should the chain consist of
  modules: {
    Balances,
    Admin,
  },
});

// compile the chain into a verification key
const { verificationKey } = await chain.compile();
```

Chain works as a wrapper for all circuit logic contained by the runtime module methods. Compilation produces a _wrap circuit_ including all known methods of the configured runtime modules.

Here's an example `Balances` runtime module:

```typescript
@runtimeModule()
export class Balances extends RuntimeModule {
  @state() public totalSupply = State.from<UInt64>(UInt64);

  @state() public balances = StateMap.from<PublicKey, UInt64>(
    PublicKey,
    UInt64
  );

  public constructor(public admin: Admin) {
    super();
  }

  @runtimeMethod()
  public getTotalSupply() {
    this.totalSupply.get();
  }

  @runtimeMethod()
  public setTotalSupply() {
    this.totalSupply.set(UInt64.from(20));
    this.admin.isAdmin();
  }

  @runtimeMethod()
  public getBalance(address: PublicKey): Option<UInt64> {
    return this.balances.get(address);
  }
}
```

The Balances runtime module shows how the YAB runtime module API can be used:

- `runtimeModule()` - marks the class as a runtime module
- `class Balance extends RuntimeModule` - introduces runtime module APIs into the runtime module
- `@state() public totalSupply = State.from<UInt64>(UInt64)` - defines a runtime module state of type `UInt64`, which can be either get or set
- `@state() public balances = StateMap.from<PublicKey, UInt64>(PublicKey, UInt64)` - defines a runtime module map state, which allows values to be stored under keys, respective of the given key & value types.
- `public constructor(public admin: Admin)` - injects a runtime module dependency to another runtime module `Admin`, which is a standalone runtime module
- `@runtimeMethod() public getTotalSupply()` - defines a runtime module method containing circuit logic for a runtime state transition. Methods define how the chain state is transformed from the initial state to the resulting state.
- `this.admin.isAdmin()` - shows how runtime module interoperability works, a configured runtime module is injected in the constructor, and can be used within the existing methods. Code of the called runtime module becomes part of the original method circuit (setTotalSupply in this case).

## Method wrapper circuit

Every runtime module method gets wrapped into an extra outter circuit, which allows the underlying runtime to make assertions about the results of the method execution, such as:

- State transitions
- Execution status
- Transaction hash (method invocation arguments)
- Network state (TODO)

The good thing is, the YAB runtime module API does this for you automatically, but it pays off to keep this in mind when debugging your runtime modules. Due to the nature of the underlying ZK method lifecycle, methods cannot produce any side effects beyond the state transitions, which are implicitly generated using the `State` API. Again due to method lifecycle implications, your method code will run multiple times at different stages of its lifecycle, such as:

- Compilation
- Simulation
- Proving

> Please be careful about keeping your runtime module methods side-effect free, since it may introduce inconsistencies in the method lifecycle which may lead to the inability to generate an execution proof.

## Testing

Runtime module methods can be ran or tested in two different modes:

- Simulation
- Proving

Simulation mode means that only the method javascript code will run, and no proving will be done. This is the fastest way of testing your module methods.

Provnig mode means that the whole chain needs to be compiled, and then every method execution can be additionally proven by accessing the provers generated during method simulation.

Here's an example of how a runtime module method execution proof can be generated, but please keep in mind you also need to enable proofs and compile the chain. More detailed examples can be found in `test/modules`:

```typescript
const chain = Chain.from({
  state,

  modules: {
    Balances,
    Admin,
  },
});

const balances = chain.resolve("Balances");
balances.getTotalSupply();

const {
  result: { prove },
} = container.resolve(MethodExecutionContext);
const proof = await prove();
```
