export interface AbstractTask {
  name: () => string;
  prepare: () => Promise<void>;
}

export interface SingleResultTask<Result> extends AbstractTask {
  resultSerializer: () => TaskSerializer<Result>;
}

export interface ReducableTask<Result> extends SingleResultTask<Result> {
  /**
   * Reduces two elements into one, for example via merging
   */
  reduce: (r1: Result, r2: Result) => Promise<Result>;

  /**
   * Checks if the two inputs r1 and r2 are reducible into a single Result.
   * This method has to return the same value on both r1->r2 and r2->r1,
   * i.e. the implementation has to be commutative
   */
  reducible: (r1: Result, r2: Result) => boolean;
}

export interface MappingTask<Input, Result> extends SingleResultTask<Result> {
  /**
   * Is the first step of this task, which generates a Result from a given
   * Input. That Result(s) can then be reduced into a single Result via reduce()
   */
  map: (input: Input) => Promise<Result>;

  inputSerializer: () => TaskSerializer<Input>;
}

export interface MapReduceTask<Input, Result>
  extends ReducableTask<Result>,
    MappingTask<Input, Result> {}

export interface PairedMapTask<Input1, Output1, Input2, Output2>
  extends AbstractTask {
  mapOne: (input: Input1) => Promise<Output1>;
  mapTwo: (input: Input2) => Promise<Output2>;

  serializers: () => {
    input1: TaskSerializer<Input1>;
    output1: TaskSerializer<Output1>;
    input2: TaskSerializer<Input2>;
    output2: TaskSerializer<Output2>;
  };
}

export interface TaskSerializer<Type> {
  toJSON: (input: Type) => string;
  fromJSON: (json: string) => Type;
}

export const JSONTaskSerializer = {
  // eslint-disable-next-line etc/no-misused-generics
  fromType<Type>(): TaskSerializer<Type> {
    return {
      fromJSON(json: string): Type {
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        return JSON.parse(json) as Type;
      },

      toJSON(input: Type): string {
        return JSON.stringify(input);
      },
    };
  },
};

export interface TaskPayload {
  status?: "error" | "success";
  name: string;
  payload: string;
  taskId?: string;
  flowId: string;
}
