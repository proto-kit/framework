import { noop } from "@proto-kit/common";

import { TaskWorkerModule } from "../worker/TaskWorkerModule";

import { Task, TaskSerializer } from "./Task";

/**
 * Contract:
 * Doesn't implement prepare()
 */
export abstract class UnpreparingTask<Input, Output>
  extends TaskWorkerModule
  implements Task<Input, Output>
{
  abstract name: string;

  public async prepare() {
    noop();
  }

  abstract compute(input: Input): Promise<Output>;

  abstract inputSerializer(): TaskSerializer<Input>;

  abstract resultSerializer(): TaskSerializer<Output>;
}
