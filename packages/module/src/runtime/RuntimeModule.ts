import { configurableModule, ConfigurableModule, Presets } from "@yab/protocol";

import type { Runtime } from "./Runtime";

/**
 * Base class for runtime modules providing the necessary utilities.
 */
@configurableModule()
export class RuntimeModule<
  Config,
  CurrentRuntime extends Runtime = Runtime
> extends ConfigurableModule<Config> {
  public static presets: Presets<unknown> = {};

  public name?: string;

  public runtime?: CurrentRuntime;
}
