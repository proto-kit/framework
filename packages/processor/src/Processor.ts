import {
  ModuleContainer,
  ModuleContainerDefinition,
  ModulesRecord,
  TypedClass,
} from "@proto-kit/common";
import { container } from "tsyringe";

import { ProcessorModule } from "./ProcessorModule";

export type ProcessorModulesRecord = ModulesRecord<
  TypedClass<ProcessorModule<unknown>>
>;

export class Processor<
  Modules extends ProcessorModulesRecord,
> extends ModuleContainer<Modules> {
  public static from<Modules extends ProcessorModulesRecord>(
    definition: ModuleContainerDefinition<Modules>
  ): Processor<Modules> {
    return new Processor(definition);
  }

  public async start() {
    this.create(() => container);

    // need to start each module in order for dependencies() to be registred
    for (const moduleName of this.moduleNames) {
      const module =
        this.container.resolve<ProcessorModule<unknown>>(moduleName);
      // eslint-disable-next-line no-await-in-loop
      await module.start();
    }
  }
}
