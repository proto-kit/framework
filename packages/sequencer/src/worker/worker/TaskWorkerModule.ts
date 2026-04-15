import { ConfigurableModule, implement, NoConfig } from "@proto-kit/common";

import { Task } from "../flow/Task";

export abstract class TaskWorkerModule<
  Config = NoConfig,
> extends ConfigurableModule<Config> {}

export function task<Input, Output>() {
  return implement<Task<Input, Output>>("Task");
}
