import type { Runtime, RuntimeModules } from "./Runtime";
import { ConfigurationReceiver, FlipOptional } from "@yab/protocol";

/**
 * Base class for runtime modules providing the necessary utilities.
 */

export abstract class RuntimeModule<Config> implements ConfigurationReceiver<Config> {
  public name?: string;

  public chain?: Runtime<RuntimeModules>;

  private _configSupplier?: () => Config;

  set configSupplier(value: () => Config) {
    this._configSupplier = value;
  }

  get config(): Config {
    if (this._configSupplier === undefined) {
      throw new Error("RuntimeModule config has not been set!"); // TODO Check properly, Config could also be void
    }
    return this._configSupplier();
  }

  abstract get defaultConfig(): FlipOptional<Config>
}
