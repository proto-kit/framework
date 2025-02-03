import { LocalTaskWorkerModule, TaskQueue, TypedClass } from "../../src";

export interface MinimumWorkerModules {
  TaskQueue: TypedClass<TaskQueue>;
  LocalTaskWorkerModule: TypedClass<LocalTaskWorkerModule<any>>;
}
