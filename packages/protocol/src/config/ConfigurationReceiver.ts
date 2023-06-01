import { FlipOptional } from "./Types";

/**
 * Configs:
 *
 * A property that accepts undefined, is an optional argument.
 * That means that you will have to provide it via defaultArguments() and it will be non-undefined via this.config.
 * This is used by devs to indicate configurability but not necessary explicit definition.
 * I.e. when the default arguments will work most of the time
 *
 * If devs want a property that can be undefined, they should use null instead
 *
 */
export interface ConfigurationReceiver<Config> {
  get config(): Required<Config>;
  set config(config: Required<Config>);

  get defaultConfig(): FlipOptional<Config>;
}
