# YAB: Sequencer

This package includes everything that is required to run a sequencer

## Sequencer

A Sequencer is structure similar to a Runtime.
It is given a list of SequencerModules, that are then dynamically instantiated and resolved by the Sequencer.
When calling `.start()` on a sequencer, the sequencer starts up all the modules and exposes the services provided by them.

### Sequencer modules

A Sequencer module is an abstract class that needs to be extended by any concrete sequencer module implementation(s).

```typescript
export abstract class SequencerModule<
  Config
> extends ConfigurableModule<Config> {
  public abstract start(): Promise<void>;

  // more properties
}
```

The generic type parameter `Config` refers to the configuration object a module consumes.
More on that below.

The `start()` method is called by the sequencer when it gets started.
It returns a Promise that has to resolve after initialization, since it will block in the sequencer startup.
That means that you mustn't `await server.start()` for example.
