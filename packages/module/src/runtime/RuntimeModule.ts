import { ConfigurationReceiver, FlipOptional } from "@yab/protocol";

import type { Runtime, RuntimeModules } from "./Runtime";

const errors = {
  configNotSet: () => new Error("RuntimeModule config has not been set!"),
};

/**
 * Base class for runtime modules providing the necessary utilities.
 */
export abstract class RuntimeModule<Config> implements ConfigurationReceiver<Config> {
  public name?: string;

  public chain?: Runtime<RuntimeModules>;

  private currentConfig?: Required<Config> = undefined;

  public get config(): Required<Config> {
    if (this.currentConfig === undefined) {
      throw errors.configNotSet(); // TODO Check properly, Config could also be void
    }
    return this.currentConfig;
  }

  public set config(config: Required<Config>) {
    this.currentConfig = config;
  }

  public abstract get defaultConfig(): FlipOptional<Config>;
}

/**
 * This class
 */
export abstract class PlainRuntimeModule extends RuntimeModule<{}> {
  public get defaultConfig(): FlipOptional<{}> {
    return {};
  }
}
