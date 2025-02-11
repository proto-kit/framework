import {
  EventEmitter,
  EventEmittingContainer,
  log,
  ModuleContainer,
  ModulesConfig,
  ModulesRecord,
  NoConfig,
  Presets,
  ResolvableModules,
  StringKeyOf,
  TypedClass,
} from "@proto-kit/common";
import { ReturnType } from "@proto-kit/protocol";

import { NewBlockTask } from "../../protocol/production/tasks/NewBlockTask";
import { RuntimeProvingTask } from "../../protocol/production/tasks/RuntimeProvingTask";
import {
  sequencerModule,
  SequencerModule,
} from "../../sequencer/builder/SequencerModule";
import { SettlementProvingTask } from "../../settlement/tasks/SettlementProvingTask";
import { Task } from "../flow/Task";
import { TaskQueue } from "../queue/TaskQueue";
import { StateTransitionTask } from "../../protocol/production/tasks/StateTransitionTask";
import { CircuitCompilerTask } from "../../protocol/production/tasks/CircuitCompilerTask";
import { closeable } from "../../sequencer/builder/Closeable";
import { StateTransitionReductionTask } from "../../protocol/production/tasks/StateTransitionReductionTask";
import { TransactionProvingTask } from "../../protocol/production/tasks/TransactionProvingTask";
import { BlockReductionTask } from "../../protocol/production/tasks/BlockReductionTask";

import { FlowTaskWorker } from "./FlowTaskWorker";
import { TaskWorkerModule } from "./TaskWorkerModule";
import { WorkerRegistrationTask } from "./startup/WorkerRegistrationTask";

// Temporary workaround against the compiler emitting
// import("common/dist") inside the library artifacts
// which leads to error in consuming packages (namely stack)
export { TypedClass };

export type TaskWorkerModulesRecord = ModulesRecord<
  // TODO any -> unknown
  TypedClass<TaskWorkerModule & Task<any, any>>
>;

type LocalTaskWorkerModuleEvents = { ready: [boolean] };

/**
 * This module spins up a worker in the current local node instance.
 * This should only be used for local testing/development and not in a
 * production setup. Use the proper worker execution method for spinning up
 * cloud workers.
 */
@sequencerModule()
@closeable()
export class LocalTaskWorkerModule<Tasks extends TaskWorkerModulesRecord>
  extends ModuleContainer<Tasks>
  implements
    SequencerModule,
    EventEmittingContainer<LocalTaskWorkerModuleEvents>
{
  public static presets: Presets<unknown> = {};

  public containerEvents = new EventEmitter<LocalTaskWorkerModuleEvents>();

  private worker?: FlowTaskWorker<
    InstanceType<ResolvableModules<Tasks>[StringKeyOf<Tasks>]>[]
  > = undefined;

  public static from<Tasks extends TaskWorkerModulesRecord>(
    modules: Tasks
  ): TypedClass<LocalTaskWorkerModule<Tasks>> {
    return class ScopedTaskWorkerModule extends LocalTaskWorkerModule<Tasks> {
      public constructor() {
        super(modules);
      }
    };
  }

  public constructor(modules: Tasks) {
    super({ modules });

    // Since we disabled configs for tasks, we initialize the config as empty here
    const config = Object.keys(modules).reduce<Record<string, NoConfig>>(
      (acc, moduleName) => {
        this.assertIsValidModuleName(moduleName);
        acc[moduleName] = {};
        return acc;
      },
      {}
    );
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    this.currentConfig = config as ModulesConfig<Tasks>;
  }

  private taskQueue() {
    return this.container.resolve<TaskQueue>("TaskQueue");
  }

  public async start(): Promise<void> {
    const tasks = this.moduleNames.map((moduleName) => {
      this.assertIsValidModuleName(moduleName);

      const task = this.resolve(moduleName);
      log.debug(`Resolved task ${task.name}`);
      return task;
    });

    const worker = new FlowTaskWorker(this.taskQueue(), [...tasks]);
    this.worker = worker;

    await worker.start();

    void worker
      .waitForPrepared()
      .then(() => {
        this.containerEvents.emit("ready", true);
      })
      .catch((e) => {
        log.error("Error occurring waiting for the ready event", e);
      });
  }

  public async close() {
    if (this.worker !== undefined) {
      await this.worker.close();
    }
  }
}

export class VanillaTaskWorkerModules {
  public static withoutSettlement() {
    return {
      StateTransitionTask,
      StateTransitionReductionTask,
      RuntimeProvingTask,
      TransactionProvingTask,
      BlockReductionTask,
      NewBlockTask,
      CircuitCompilerTask,
      WorkerRegistrationTask,
    } satisfies TaskWorkerModulesRecord;
  }

  public static allTasks() {
    return {
      ...VanillaTaskWorkerModules.withoutSettlement(),
      SettlementProvingTask,
    } satisfies TaskWorkerModulesRecord;
  }

  public static defaultConfig() {
    return {
      StateTransitionTask: {},
      RuntimeProvingTask: {},
      TransactionProvingTask: {},
      BlockReductionTask: {},
      NewBlockTask: {},
      StateTransitionReductionTask: {},
      SettlementProvingTask: {},
      CircuitCompilerTask: {},
      WorkerRegistrationTask: {},
    } satisfies ModulesConfig<
      ReturnType<typeof VanillaTaskWorkerModules.allTasks>
    >;
  }
}

export type TaskWorkerModulesWithoutSettlement = ReturnType<
  typeof VanillaTaskWorkerModules.withoutSettlement
>;
export type AllTaskWorkerModules = ReturnType<
  typeof VanillaTaskWorkerModules.allTasks
>;
