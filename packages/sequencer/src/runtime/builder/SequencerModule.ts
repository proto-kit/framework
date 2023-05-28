import { ConfigurationReceiver, FlipOptional } from "@yab/protocol";

/**
 * Lifecycle of a SequencerModule
 *
 * start(): Executed to execute any logic required to start the module
 */
export abstract class SequencerModule<Config> implements ConfigurationReceiver<Config> {
  public abstract start(): Promise<void>;

  // public constructor(config: OptionalKeys<Config> | undefined) {
  //   let defaultConfig = this.defaultConfig()
  //
  // }

  private currentConfig: Required<Config>

  public get config(): Required<Config> {
    return this.currentConfig;
  }

  public set config(config: Required<Config>) {
    this.currentConfig = config
  }

  abstract get defaultConfig(): FlipOptional<Config>;

}