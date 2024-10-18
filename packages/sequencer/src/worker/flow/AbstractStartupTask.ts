import { EventEmitter, EventEmittingComponent } from "@proto-kit/common";

import { TaskWorkerModule } from "../worker/TaskWorkerModule";

import { Task, TaskSerializer } from "./Task";

export type StartupTaskEvents = {
  "startup-task-finished": [];
};

export abstract class AbstractStartupTask<Input, Output>
  extends TaskWorkerModule
  implements EventEmittingComponent<StartupTaskEvents>, Task<Input, Output>
{
  abstract name: string;

  abstract prepare(): Promise<void>;

  abstract compute(input: Input): Promise<Output>;

  abstract inputSerializer(): TaskSerializer<Input>;

  abstract resultSerializer(): TaskSerializer<Output>;

  events = new EventEmitter<StartupTaskEvents>();
}
