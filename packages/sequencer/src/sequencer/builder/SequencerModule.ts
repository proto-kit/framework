import {
  ConfigurableModule,
  StaticConfigurableModule,
  TypedClass,
  Presets,
  NoConfig,
} from "@proto-kit/common";
import { injectable } from "tsyringe";

/**
 * Lifecycle of a SequencerModule
 *
 * start(): Executed to execute any logic required to start the module
 */
export abstract class SequencerModule<
  Config = NoConfig,
> extends ConfigurableModule<Config> {
  public static presets: Presets<unknown> = {};

  /**
   * Start the module and all it's functionality.
   * The returned Promise has to resolve after initialization,
   * since it will block in the sequencer init.
   * That means that you mustn't await server.start() for example.
   */
  public abstract start(): Promise<void>;
}

/**
 * Marks the decorated class as a runtime module, while also
 * making it injectable with our dependency injection solution.
 */
export function sequencerModule() {
  return (
    target: StaticConfigurableModule<unknown> &
      TypedClass<SequencerModule<unknown>>
  ) => {
    injectable()(target);
  };
}
