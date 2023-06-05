import type { FlipOptional } from "./types";

const errors = {
  configNotSet: () => new Error("RuntimeModule config has not been set!"),
};

/**
 * Configs:
 *
 * A property that accepts undefined, is an optional argument.
 * That means that you will have to provide it via defaultConfig() and it will be non-undefined via this.config.
 * This is used by devs to indicate configurability but not necessary explicit definition.
 * I.e. when the default arguments will work most of the time
 *
 * If devs want a property that can be undefined, they should use null instead
 *
 */
export abstract class ConfigurationReceiver<Config> {
  private currentConfig?: Required<Config> = undefined;

  /**
   * Retrieves the configured config object.
   * This is only available in instance methods like start(), using this in the constructor will throw an Exception
   */
  public get config(): Required<Config> {
    if (this.currentConfig === undefined) {
      // eslint-disable-next-line no-warning-comments
      // TODO Check properly, Config could also be void
      throw errors.configNotSet();
    }
    return this.currentConfig;
  }

  public set config(config: Required<Config>) {
    this.currentConfig = config;
  }

  public abstract get defaultConfig(): FlipOptional<Config>;
}
