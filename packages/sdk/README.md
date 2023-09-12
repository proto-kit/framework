# YAB: SDK

SDK for developing privacy enabled application chains.

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

appChain.configure({
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
   In a nutshell, all "smart contract" logic that a developer wants to create for their rollup.
   For more documentation on Runtime, please refer to @protokit/module

2. The Sequencer definition.
   A sequencer is responsible for all services that interact with the Runtime, but are not provable code itself.
   That could be a GraphQL interface, P2P networking layer, database layer, ...
