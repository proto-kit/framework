import { ConfigurableModule, Presets } from "@yab/common";
import { injectable } from "tsyringe";

import type {
  Runtime,
  RuntimeDefinition,
  RuntimeModulesRecord,
} from "./Runtime";
import { StateService } from "../state/InMemoryStateService";

/**
 * This type exists to carry over certain runtime properties
 * to runtime modules, until we can inject them through DI.
 */
export interface PartialRuntime
  extends Pick<Runtime<RuntimeModulesRecord>, "zkProgrammable"> {
  definition: Pick<RuntimeDefinition<RuntimeModulesRecord>, "state">;

  get stateService(): StateService;
}

/**
 * Base class for runtime modules providing the necessary utilities.
 */
@injectable()
export class RuntimeModule<Config> extends ConfigurableModule<Config> {
  public static presets: Presets<unknown> = {};

  /**
   * This property exists only to typecheck that the RuntimeModule
   * was extended correctly in e.g. a decorator. We need at least
   * one non-optional property in this class to make the typechecking work.
   */
  public isRuntimeModule = true;

  public name?: string;

  public runtime?: Runtime<RuntimeModulesRecord>;
}
