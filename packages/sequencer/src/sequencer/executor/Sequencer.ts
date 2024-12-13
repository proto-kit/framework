import {
  ModuleContainer,
  ModulesRecord,
  TypedClass,
  ModuleContainerDefinition,
  log,
} from "@proto-kit/common";
import {
  Runtime,
  RuntimeModulesRecord,
  MethodIdFactory,
} from "@proto-kit/module";
import {
  MandatoryProtocolModulesRecord,
  Protocol,
  ProtocolModulesRecord,
} from "@proto-kit/protocol";
import { DependencyContainer, injectable } from "tsyringe";

import { SequencerModule } from "../builder/SequencerModule";

import { Sequenceable } from "./Sequenceable";

export type SequencerModulesRecord = ModulesRecord<
  TypedClass<SequencerModule<unknown>>
>;

@injectable()
export class Sequencer<Modules extends SequencerModulesRecord>
  extends ModuleContainer<Modules>
  implements Sequenceable
{
  /**
   * Alternative constructor for Sequencer
   * @param definition
   * @returns Sequencer
   */
  public static from<Modules extends SequencerModulesRecord>(
    definition: ModuleContainerDefinition<Modules>
  ): TypedClass<Sequencer<Modules>> {
    return class ScopedSequencer extends Sequencer<Modules> {
      public constructor() {
        super(definition);
      }
    };
  }

  public get runtime(): Runtime<RuntimeModulesRecord> {
    return this.container.resolve<Runtime<RuntimeModulesRecord>>("Runtime");
  }

  public get protocol(): Protocol<
    MandatoryProtocolModulesRecord & ProtocolModulesRecord
  > {
    return this.container.resolve<
      Protocol<MandatoryProtocolModulesRecord & ProtocolModulesRecord>
    >("Protocol");
  }

  public get dependencyContainer(): DependencyContainer {
    return this.container;
  }

  /**
   * Starts the sequencer by iterating over all provided
   * modules to start each
   */
  public async start() {
    // The sequencer uses Tysringe to resolve modules (and their dependencies)
    // and then starts them. However, this can be problematic as although Tysringe may resolve
    // dependencies, it doesn't actually start them. For example, a database may be created,
    // but the connection strings, etc, won't be constructed until it's started, and this may
    // cause an error if a module that relies on it is started first. The way to fix this is
    // ensure that we start modules based on the order they were resolved.
    // We iterate through the methods three times:

    this.useDependencyFactory(this.container.resolve(MethodIdFactory));

    // Log startup info
    const moduleClassNames = Object.values(this.definition.modules).map(
      (clazz) => clazz.name
    );
    log.info("Starting sequencer...");
    log.info("Modules:", moduleClassNames);

    // Iteration #1: We invoke the afterResolution feature for the container
    // to ensure every time a module is resolved it gets recorded.
    const orderedModules: Extract<keyof Modules, string>[] = [];
    // eslint-disable-next-line guard-for-in
    for (const moduleName in this.definition.modules) {
      this.container.afterResolution(
        moduleName,
        () => {
          orderedModules.push(moduleName);
        },
        {
          frequency: "Once",
        }
      );
    }
    // Iteration #2: We resolve each module and thus populate
    // the orderedModules list to understand the sequencing.
    // eslint-disable-next-line guard-for-in
    for (const moduleName in this.definition.modules) {
      const sequencerModule = this.resolve(moduleName);
      log.info(
        `Resolving sequencer module ${moduleName} (${sequencerModule.constructor.name})`
      );
    }

    // Iteration #3: We now iterate though the orderedModules list
    // and start the modules in the order they were resolved.
    for (const moduleName of orderedModules) {
      const sequencerModule = this.resolve(moduleName);
      // eslint-disable-next-line no-await-in-loop
      await sequencerModule.start();

      log.info(
        `Starting sequencer module ${moduleName} (${sequencerModule.constructor.name})`
      );
    }
  }
}
