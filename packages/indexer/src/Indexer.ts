import {
  ChildContainerProvider,
  ModuleContainer,
  ModulesRecord,
  TypedClass,
} from "@proto-kit/common";
import { ConsoleTracingFactory } from "@proto-kit/sequencer";
import { container } from "tsyringe";

import { IndexerModule } from "./IndexerModule";
import { IndexerHeightInstrumentation } from "./IndexerHeightInstrumentation";

export type IndexerModulesRecord = ModulesRecord<
  TypedClass<IndexerModule<unknown>>
>;

export class Indexer<
  Modules extends IndexerModulesRecord,
> extends ModuleContainer<Modules> {
  public static from<Modules extends IndexerModulesRecord>(
    definition: Modules
  ): Indexer<Modules> {
    return new Indexer(definition);
  }

  public get taskQueue(): InstanceType<Modules["TaskQueue"]> {
    return this.container.resolve("TaskQueue");
  }

  public static dependencies() {
    return {
      IndexerHeightInstrumentation: {
        useClass: IndexerHeightInstrumentation,
      },
    };
  }

  public create(childContainerProvider: ChildContainerProvider) {
    super.create(childContainerProvider);
    this.useDependencyFactory(ConsoleTracingFactory);
    this.useDependencyFactory(Indexer);
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
