import { ConfigurableModule, NoConfig, Presets } from "@proto-kit/common";
import { container, injectable } from "tsyringe";
import {
  NetworkState,
  RuntimeTransaction,
  RuntimeMethodExecutionContext,
  RuntimeMethodExecutionData,
  RuntimeMethodExecutionDataStruct,
} from "@proto-kit/protocol";
import { Provable } from "o1js";

import { runtimeMethodNamesMetadataKey } from "../method/runtimeMethod";

import { RuntimeEnvironment } from "./RuntimeEnvironment";

const errors = {
  inputDataNotSet: () => new Error("Input data for runtime execution not set"),
};

/**
 * Base class for runtime modules providing the necessary utilities.
 */
@injectable()
export class RuntimeModule<
  Config = NoConfig,
> extends ConfigurableModule<Config> {
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

  public runtime?: RuntimeEnvironment;

  public constructor() {
    super();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const methodNames: string[] | undefined = Reflect.getMetadata(
      runtimeMethodNamesMetadataKey,
      this
    );
    this.runtimeMethodNames = methodNames ?? [];
  }

  public getInputs(): RuntimeMethodExecutionData {
    return Provable.witness(RuntimeMethodExecutionDataStruct, () => {
      const { input } = container.resolve<RuntimeMethodExecutionContext>(
        RuntimeMethodExecutionContext
      );
      if (input === undefined) {
        throw errors.inputDataNotSet();
      }

      return input;
    });
  }

  public get transaction(): RuntimeTransaction {
    return this.getInputs().transaction;
  }

  public get network(): NetworkState {
    return this.getInputs().networkState;
  }
}
