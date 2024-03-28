import { ModuleContainer, ModulesRecord, TypedClass } from "@proto-kit/common";
import { container } from "tsyringe";
import { IndexerModule } from "./IndexerModule";

export type IndexerModulesRecord = ModulesRecord<
  TypedClass<IndexerModule<unknown>>
>;

export class Indexer<
  Modules extends IndexerModulesRecord
> extends ModuleContainer<Modules> {
  public get taskQueue(): InstanceType<Modules["TaskQueue"]> {
    return this.container.resolve("TaskQueue");
  }

  public get blockStorage(): InstanceType<Modules["BlockStorage"]> {
    return this.container.resolve("BlockStorage");
  }

  public async start() {
    this.create(() => container);

    // need to start each module in order for dependencies() to be registred
    for (const moduleName of this.moduleNames) {
      const module = this.container.resolve<IndexerModule<unknown>>(moduleName);
      module.start();
    }
  }
}
