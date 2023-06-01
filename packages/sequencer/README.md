# YAB: Sequencer

This package includes everything that is required to run a sequencer

## AppChain

To use an appchain, you should use the following syntax as provided by this example:

```typescript
const appChain = AppChain.from({
  sequencer: Sequencer.from({
    graphql: GraphQLServerModule,
  }),

  runtime: Runtime.from({
    runtimeModules: {
      admin: Admin,
    },

    state: new InMemoryStateService(),
  }),
});

appChain.config({
  sequencer: {
    graphql: {
      port: 8080,
    },
  },

  runtime: {
    admin: {
      publicKey: "123",
    },
  },
});

await appChain.start();
```

The AppChain takes two arguments, a Runtime and a Sequencer. 
1. The Runtime holds all modules that have provable code. 
In a nutshell, all "smart contract" logic that a developer wants to create for his rollup.
For more documentation on Runtime, please refer to @protokit/module

2. The Sequencer definition.
A sequencer is responsible for all services that interact with the Runtime, but are not provable code itself.
That could be a GraphQL interface, P2P networking layer, database layer, ...

## Sequencer

A Sequencer is structure similar to a Runtime. 
It is given a list of SequencerModules, that are then dynamically instantiated and resolved by the Sequencer.
When calling `.start()` on a sequencer, the sequencer starts up all the modules and exposes the services provided by them.

### Sequencer modules

A Sequencer module has the following interface that every module implementation has to implement.

```typescript
interface SequencerModule<Config> {
  start(): Promise<void>;
  get defaultConfig(): FlipOptional<Config>;
}
```

The generic type parameter `Config` refers to the configuration object a module consumes.
More on that below.

The `start()` method is called by the sequencer when it gets started.
It returns a Promise that has to resolve after initialization, since it will block in the sequencer startup.
That means that you mustn't `await server.start()` for example.

#### Config

Configs are TS Objects that are provided via generics. 

A property that accepts undefined, is an optional argument.
That means that you will have to provide it via `defaultConfig()` and it will be non-undefined via this.config.
This is used by devs to indicate configurability but not necessary explicit definition.
I.e. when the default arguments will work most of the time

If devs want a property that can be undefined, they should use null instead

An example of that could look like:

```typescript
interface GraphQLConfig {
  port: number, // Required values
  host?: string // Optional values (have to provided via defaultConfig)
}
```

In this case, `defaultConfig()` would only have to provide `host`. 
`port` has to be provided by the executing user (for example via `sequencer.config()`).


The config can be accessed inside the module using `this.config` inside and after `start()` is called.
If you try to access `this.config` inside the constructor, this will throw an error since it won't be initialized yet.

