import { TaskSerializer } from "../manager/ReducableTask";

export interface Task<Input, Result> {
  name: string;

  prepare: () => Promise<void>;

  compute: (input: Input) => Promise<Result>;

  inputSerializer: () => TaskSerializer<Input>;
  resultSerializer: () => TaskSerializer<Result>;
}