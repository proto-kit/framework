import { ConfigurableModule, Presets } from "@yab/common";

import type {
  Runtime,
  RuntimeDefinition,
  RuntimeModulesRecord,
} from "./Runtime";

/**
 * Base class for runtime modules providing the necessary utilities.
 */
export abstract class RuntimeModule<Config> extends ConfigurableModule<Config> {
  public static presets: Presets<unknown> = {};

  /**
   * This property exists only to typecheck that the RuntimeModule
   * was extended correctly in e.g. a decorator. We need at least
   * one non-optional property in this class to make the typechecking work.
   */
  public isRuntimeModule = true;

  public name?: string;

  public runtime?: Pick<Runtime<RuntimeModulesRecord>, "areProofsEnabled"> & {
    state?: Pick<RuntimeDefinition<RuntimeModulesRecord>, "state">;
  };
}
