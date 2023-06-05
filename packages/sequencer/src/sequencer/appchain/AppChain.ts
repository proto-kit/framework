import { ResolvedRuntimeModules, Runtime, RuntimeModules } from "@yab/module";
import { ComponentConfig, RemoveUndefinedKeys } from "@yab/protocol";
import { container as globalContainer, DependencyContainer } from "tsyringe";

import { Sequenceable } from "../executor/Sequenceable";
import { SequencerModulesType } from "../builder/types";

const errors = {
  appChainNotStarted: () => new Error("AppChain has not been started yet"),
};

interface SequencerBuilder<SequencerModules extends SequencerModulesType> {
  (container: DependencyContainer): Sequenceable<SequencerModules>;
}

interface AppChainDefinition<
  SequencerModules extends SequencerModulesType,
  RuntimeConfig extends RuntimeModules
> {
  sequencer: SequencerBuilder<SequencerModules>;
  runtime: Runtime<RuntimeConfig>;
}

type ConsumableRuntimeConfig<RuntimeConfig extends RuntimeModules> = RemoveUndefinedKeys<
  ComponentConfig<ResolvedRuntimeModules<RuntimeConfig>>
>;

interface AppChainConfig<
  SequencerModules extends SequencerModulesType,
  RuntimeConfig extends RuntimeModules
> {
  sequencer: RemoveUndefinedKeys<ComponentConfig<SequencerModules>>;
  runtime: ConsumableRuntimeConfig<RuntimeConfig>;
}

export class AppChain<
  SequencerModules extends SequencerModulesType,
  RuntimeConfig extends RuntimeModules
> {
  public static from<
    SequencerModules extends SequencerModulesType,
    RuntimeConfig extends RuntimeModules
  >(definition: AppChainDefinition<SequencerModules, RuntimeConfig>) {
    return new AppChain(definition);
  }

  private startedSequencer?: Sequenceable<SequencerModules>;

  public constructor(
    private readonly definition: AppChainDefinition<SequencerModules, RuntimeConfig>
  ) {}

  public configure(appChainConfig: AppChainConfig<SequencerModules, RuntimeConfig>) {
    this.sequencer.configure(appChainConfig.sequencer);
    this.runtime.configure(appChainConfig.runtime);
  }

  public sequencerConfig(config: AppChainConfig<SequencerModules, RuntimeConfig>["sequencer"]) {
    this.sequencer.configure(config);
  }

  public genesisConfig(config: AppChainConfig<SequencerModules, RuntimeConfig>["runtime"]) {
    this.runtime.configure(config);
  }

  // Is using getters inside the class a pattern we want to no do?
  public get sequencer(): Sequenceable<SequencerModules> {
    if (this.startedSequencer === undefined) {
      throw errors.appChainNotStarted();
    }
    return this.startedSequencer;
  }

  public get runtime(): Runtime<RuntimeConfig> {
    return this.definition.runtime;
  }

  public async start(): Promise<void> {
    this.runtime.precompile();

    const sequencerContainer = globalContainer.createChildContainer();
    sequencerContainer.registerInstance("Runtime", this.runtime);
    this.startedSequencer = this.definition.sequencer(sequencerContainer);

    // TODO
  }
}
