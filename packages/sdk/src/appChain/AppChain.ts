import { ModulesConfig } from "@yab/common";
import { Runtime, RuntimeModulesRecord } from "@yab/module";
import { Sequencer, SequencerModulesRecord } from "@yab/sequencer";

export interface AppChainDefinition<
  RuntimeModules extends RuntimeModulesRecord,
  SequencerModules extends SequencerModulesRecord
> {
  runtime: Runtime<RuntimeModules>;
  sequencer: Sequencer<SequencerModules>;
}

/**
 * Definition of required arguments for AppChain
 */
export interface AppChainConfig<
  RuntimeModules extends RuntimeModulesRecord,
  SequencerModules extends SequencerModulesRecord
> {
  runtime: ModulesConfig<RuntimeModules>;
  sequencer: ModulesConfig<SequencerModules>;
}

/**
 * AppChain acts as a wrapper connecting Runtime, Protocol and Sequencer
 */
export class AppChain<
  RuntimeModules extends RuntimeModulesRecord,
  SequencerModules extends SequencerModulesRecord
> {
  // alternative AppChain constructor
  public static from<
    RuntimeModules extends RuntimeModulesRecord,
    SequencerModules extends SequencerModulesRecord
  >(definition: AppChainDefinition<RuntimeModules, SequencerModules>) {
    return new AppChain(definition);
  }

  public constructor(
    public definition: AppChainDefinition<RuntimeModules, SequencerModules>
  ) {}

  public get runtime(): Runtime<RuntimeModules> {
    return this.definition.runtime;
  }

  public get sequencer(): Sequencer<SequencerModules> {
    return this.definition.sequencer;
  }

  /**
   * Set config of the current AppChain and its underlying components
   * @param config
   */
  public configure(config: AppChainConfig<RuntimeModules, SequencerModules>) {
    this.runtime.configure(config.runtime);
    this.sequencer.configure(config.sequencer);
  }

  /**
   * Starts the appchain and cross-registers runtime to sequencer
   */
  public async start() {
    this.sequencer.registerValue({
      Runtime: this.definition.runtime,
    });

    await this.sequencer.start();
  }
}
