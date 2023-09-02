import { ConfigurableModule, Presets } from "@proto-kit/common";
import { container, injectable } from "tsyringe";
import {
  NetworkState,
  RuntimeTransaction,
  StateService,
  RuntimeMethodExecutionContext,
  RuntimeMethodExecutionData,
} from "@proto-kit/protocol";

import { runtimeMethodNamesMetadataKey } from "../method/runtimeMethod";

import type {
  Runtime,
  RuntimeDefinition,
  RuntimeModulesRecord,
} from "./Runtime";

const errors = {
  inputDataNotSet: () => new Error("Input data for runtime execution not set"),
};

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
   * Holds all method names that are callable throw transactions
   */
  public readonly runtimeMethodNames: string[] = [];

  /**
   * This property exists only to typecheck that the RuntimeModule
   * was extended correctly in e.g. a decorator. We need at least
   * one non-optional property in this class to make the typechecking work.
   */
  public isRuntimeModule = true;

  public name?: string;

  public runtime?: Runtime<RuntimeModulesRecord>;

  public constructor() {
    super();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const methodNames: string[] | undefined = Reflect.getMetadata(
      runtimeMethodNamesMetadataKey,
      this
    );
    this.runtimeMethodNames = methodNames ?? [];
  }

  private getInputs(): RuntimeMethodExecutionData {
    const { input } = container.resolve<RuntimeMethodExecutionContext>(
      RuntimeMethodExecutionContext
    );

    if (input === undefined) {
      throw errors.inputDataNotSet();
    }
    return input;
  }

  public get transaction(): RuntimeTransaction {
    return this.getInputs().transaction;
  }

  public get network(): NetworkState {
    return this.getInputs().networkState;
  }
}
