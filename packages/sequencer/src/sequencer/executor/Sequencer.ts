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
    this.useDependencyFactory(this.container.resolve(MethodIdFactory));

    // Log startup info
    const moduleClassNames = Object.values(this.definition.modules).map(
      (clazz) => clazz.name
    );
    log.info("Starting sequencer...");
    log.info("Modules:", moduleClassNames);

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
    // eslint-disable-next-line guard-for-in
    for (const moduleName in this.definition.modules) {
      const sequencerModule = this.resolve(moduleName);
      log.info(
        `Resolving sequencer module ${moduleName} (${sequencerModule.constructor.name})`
      );
    }

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
