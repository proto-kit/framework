import {
  assert,
  InMemoryStateService,
  method,
  ResolvedRuntimeModules,
  Runtime,
  runtimeModule,
  RuntimeModule,
  RuntimeModules,
} from "@yab/module";
import { ComponentConfig, FlipOptional, RemoveUndefinedKeys } from "@yab/protocol";
import { PublicKey } from "snarkyjs";
import { container as globalContainer, DependencyContainer } from "tsyringe";

import { Sequenceable } from "../executor/Sequenceable";
import { SequencerModulesType } from "../builder/Types";
import { Sequencer } from "../executor/Sequencer";
import { GraphQLServerModule } from "../../graphql/GraphqlSequencerModule";

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

// eslint-disable-next-line import/no-unused-modules
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

  public config(appChainConfig: AppChainConfig<SequencerModules, RuntimeConfig>) {
    this.sequencer.config(appChainConfig.sequencer);
    this.runtime.config(appChainConfig.runtime);
  }

  public sequencerConfig(config: AppChainConfig<SequencerModules, RuntimeConfig>["sequencer"]) {
    this.sequencer.config(config);
  }

  public genesisConfig(config: AppChainConfig<SequencerModules, RuntimeConfig>["runtime"]) {
    this.runtime.config(config);
  }

  // Is using getters inside the class a pattern we want to no do?
  public get sequencer(): Sequenceable<SequencerModules> {
    if (this.startedSequencer === undefined) {
      throw new Error("AppChain has not been started yet");
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
  }
}