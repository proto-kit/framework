/* eslint-disable guard-for-in */
import {
  ModuleContainer,
  ModulesConfig,
  ModulesRecord,
  TypedClassConstructor,
  ModuleContainerDefinition,
} from "@yab/common";
import { Runtime } from "@yab/module";
import { injectable } from "tsyringe";

import { SequencerModule } from "../builder/SequencerModule";

// eslint-disable-next-line import/no-cycle
import { Sequenceable } from "./Sequenceable";

export type SequencerModulesRecord = ModulesRecord<
  TypedClassConstructor<SequencerModule<unknown>>
>;

@injectable()
export class Sequencer<
    Modules extends SequencerModulesRecord = SequencerModulesRecord,
    Config extends ModulesConfig<Modules> = ModulesConfig<Modules>
  >
  extends ModuleContainer<Modules, Config>
  implements Sequenceable<Modules, Config>
{
  /**
   * Alternative constructor for Sequencer
   * @param definition
   * @returns Sequencer
   */
  public static from<
    Modules extends SequencerModulesRecord,
    Config extends ModulesConfig<Modules>
  >(definition: ModuleContainerDefinition<Modules, Config>) {
    return new Sequencer(definition);
  }

  public get runtime(): Runtime {
    return this.container.resolve<Runtime>("Runtime");
  }

  /**
   * Starts the sequencer by iterating over all provided
   * modules to start each
   */
  public async start() {
    console.log("starting sequencer 2", this.definition.modules);
    for (const moduleName in this.definition.modules) {
      console.log("starting sequecncer module", moduleName);
      const sequencerModule = this.resolve(moduleName);

      // eslint-disable-next-line no-await-in-loop
      await sequencerModule.start();
    }
  }
}
