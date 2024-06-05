export interface Task<Input, Result> {
  name: string;

  prepare: () => Promise<void>;

  compute: (input: Input) => Promise<Result>;

  inputSerializer: () => TaskSerializer<Input>;
  resultSerializer: () => TaskSerializer<Result>;
}

export interface TaskSerializer<Type> {
  toJSON: (input: Type) => Promise<string> | string;
  fromJSON: (json: string) => Promise<Type> | Type;
}

export interface TaskPayload {
  status?: "error" | "success";
  name: string;
  payload: string;
  taskId?: string;
  flowId: string;
}
