import { ConfigurationReceiver, FlipOptional } from "@yab/protocol";

import type { Runtime, RuntimeModules } from "./Runtime";
/**
 * Base class for runtime modules providing the necessary utilities.
 */
export abstract class RuntimeModule<Config> extends ConfigurationReceiver<Config> {
  public name?: string;

  public chain?: Runtime<RuntimeModules>;

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
