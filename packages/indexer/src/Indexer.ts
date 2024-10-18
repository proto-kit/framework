import {
  ModuleContainer,
  ModuleContainerDefinition,
  ModulesRecord,
  TypedClass,
} from "@proto-kit/common";
import { container } from "tsyringe";

import { IndexerModule } from "./IndexerModule";

export type IndexerModulesRecord = ModulesRecord<
  TypedClass<IndexerModule<unknown>>
>;

export class Indexer<
  Modules extends IndexerModulesRecord,
> extends ModuleContainer<Modules> {
  public static from<Modules extends IndexerModulesRecord>(
    definition: ModuleContainerDefinition<Modules>
  ): Indexer<Modules> {
    return new Indexer(definition);
  }

  public get taskQueue(): InstanceType<Modules["TaskQueue"]> {
    return this.container.resolve("TaskQueue");
  }

  public async start() {
    this.create(() => container);

    // need to start each module in order for dependencies() to be registred
    for (const moduleName of this.moduleNames) {
      const module = this.container.resolve<IndexerModule<unknown>>(moduleName);
      // eslint-disable-next-line no-await-in-loop
      await module.start();
    }
  }
}
