import { Runtime as BaseRuntime } from "@yab/module";
import { Sequencer as BaseSeqeuncer } from "@yab/sequencer";

export interface AppChainDefinition<
  Runtime extends BaseRuntime,
  Sequencer extends BaseSeqeuncer
> {
  runtime: Runtime;
  sequencer: Sequencer;
}

/**
 * Definition of required arguments for AppChain
 */
export interface AppChainConfig<
  Runtime extends BaseRuntime,
  Sequencer extends BaseSeqeuncer
> {
  runtime: Required<Runtime["definition"]["config"]>;
  sequencer: Required<Sequencer["definition"]["config"]>;
}

/**
 * AppChain acts as a wrapper connecting Runtime, Protocol and Sequencer
 */
export class AppChain<
  Runtime extends BaseRuntime,
  Sequencer extends BaseSeqeuncer
> {
  // alternative AppChain constructor
  public static from<
    Runtime extends BaseRuntime,
    Sequencer extends BaseSeqeuncer
  >(definition: AppChainDefinition<Runtime, Sequencer>) {
    return new AppChain(definition);
  }

  public constructor(
    public definition: AppChainDefinition<Runtime, Sequencer>
  ) {}

  public get runtime(): Runtime {
    return this.definition.runtime;
  }

  public get sequencer(): Sequencer {
    return this.definition.sequencer;
  }

  /**
   * Set config of the current AppChain and its underlying components
   * @param config
   */
  public configure(config: AppChainConfig<Runtime, Sequencer>) {
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
