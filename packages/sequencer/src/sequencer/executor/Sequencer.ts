import {
  ModuleContainer,
  ModulesRecord,
  TypedClass,
  log,
  ChildContainerProvider,
  mapSequential,
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
import { injectable } from "tsyringe";
import { Field } from "o1js";

import { SequencerModule } from "../builder/SequencerModule";
import { Closeable } from "../builder/Closeable";
import { ConsoleTracingFactory } from "../../logging/ConsoleTracingFactory";
import { StartableModule } from "../builder/StartableModule";
import { TaskQueue } from "../../worker/queue/TaskQueue";

import { Sequenceable } from "./Sequenceable";

export type SequencerModulesRecord = ModulesRecord<
  TypedClass<SequencerModule<unknown>>
>;

@injectable()
export class Sequencer<Modules extends SequencerModulesRecord>
  extends ModuleContainer<Modules>
  implements Sequenceable
{
  public readonly id: string;

  public constructor(definition: Modules) {
    super(definition);
    this.id = Field.random().toString();
  }

  /**
   * Alternative constructor for Sequencer
   * @param definition
   * @returns Sequencer
   */
  public static from<Modules extends SequencerModulesRecord>(
    definition: Modules
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

  public create(childContainerProvider: ChildContainerProvider) {
    super.create(childContainerProvider);
    this.useDependencyFactory(ConsoleTracingFactory);
  }

  /**
   * Starts the sequencer by iterating over all provided
   * modules to start each
   */
  public async start() {
    // The sequencer uses tsyringe to resolve modules (and their dependencies)
    // and then starts them. However, this can be problematic as although tsyringe may resolve
    // dependencies, it doesn't actually start them. For example, a database may be created,
    // but the connection strings, etc, won't be constructed until it's started, and this may
    // cause an error if a module that relies on it is started first. The way to fix this is
    // ensure that we start modules based on the order they were resolved.
    // We iterate through the methods three times:

    this.useDependencyFactory(MethodIdFactory);

    // Drain all task queues to clear stale tasks from previous sequencer instances
    if (this.container.isRegistered("TaskQueue")) {
      const taskQueue = this.container.resolve<TaskQueue>("TaskQueue");
      await taskQueue.drainAllQueues();
    }

    // Log startup info
    const moduleClassNames = Object.values(this.definition).map(
      (clazz) => clazz.name
    );
    log.info("Starting sequencer...");
    log.info("Modules:", moduleClassNames);

    // Iteration #1: We invoke the afterResolution feature for the container
    // to ensure every time a module is resolved it gets recorded.
    const orderedModules: Extract<keyof Modules, string>[] = [];
    // eslint-disable-next-line guard-for-in
    for (const moduleName in this.definition) {
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
    for (const moduleName in this.definition) {
      const module = this.resolve(moduleName);
      log.info(
        `Resolving sequencer module ${moduleName} (${module.constructor.name})`
      );
    }

    // Iteration #3: We now iterate though the orderedModules list
    // and start the modules in the order they were resolved.
    for (const moduleName of orderedModules) {
      const module = this.resolve(moduleName);

      log.info(
        `Starting sequencer module ${moduleName} (${module.constructor.name})`
      );
      // eslint-disable-next-line no-await-in-loop
      await module.start();
    }

    // Start modules made startable via @startable()
    // TODO This doesn't dynamically resolve-and-start in-order like normal sequencer modules
    if (this.container.isRegistered("Startable", true)) {
      const additionalStartables =
        this.container.resolveAll<StartableModule>("Startable");
      await mapSequential(additionalStartables, async (startable) => {
        log.info(
          `Starting injected startable module ${startable.constructor.name}`
        );
        await startable.start();
      });
    }

    if (
      !moduleClassNames.includes("SequencerStartupModule") &&
      moduleClassNames.includes("BatchProducerModule")
    ) {
      log.warn("SequencerStartupModule is not defined.");
    }
  }

  public async close() {
    log.info("Closing sequencer...");
    const closeables = this.container.resolveAll<Closeable>("Closeable");
    await Promise.all(
      closeables.map(async (closeable) => {
        await closeable.close();
      })
    );
    log.info("Sequencer closed");
  }
}
