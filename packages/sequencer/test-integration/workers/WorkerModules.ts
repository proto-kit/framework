import { WorkerModule, TaskQueue, TypedClass } from "../../src";

export interface MinimumWorkerModules {
  TaskQueue: TypedClass<TaskQueue>;
  WorkerModule: TypedClass<WorkerModule<any>>;
}
