/* eslint-disable guard-for-in */
import {
  ModuleContainer,
  ModulesRecord,
  TypedClass,
  ModuleContainerDefinition,
  log,
} from "@yab/common";
import { Runtime, RuntimeModulesRecord } from "@yab/module";
import { injectable } from "tsyringe";

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
  ) {
    return new Sequencer(definition);
  }

  public get runtime(): Runtime<RuntimeModulesRecord> {
    return this.container.resolve<Runtime<RuntimeModulesRecord>>("Runtime");
  }

  /**
   * Starts the sequencer by iterating over all provided
   * modules to start each
   */
  public async start() {
    const moduleClassNames = Object.values(this.definition.modules).map(
      (clazz) => clazz.name
    );
    log.info("Starting sequencer...", moduleClassNames);
    for (const moduleName in this.definition.modules) {
      const sequencerModule = this.resolve(moduleName);

      log.info(
        `Starting sequecncer module ${moduleName}(${sequencerModule.constructor.name})`
      );
      // eslint-disable-next-line no-await-in-loop
      await sequencerModule.start();
    }
  }
}
