export interface AbstractTask<Result> {
  name() : string;
  prepare(): Promise<void>;
  serializer(): TaskSerializer<Result>;
}

export interface ReducableTask<Result> extends AbstractTask<Result> {
  /**
   * Reduces two elements into one, for example via merging
   */
  reduce(r1: Result, r2: Result): Promise<Result>;

  /**
   * Checks if the two inputs r1 and r2 are reducible into a single Result.
   * This method has to return the same value on both r1->r2 and r2->r1, i.e. the implementation has to be commutative
   */
  reducible(r1: Result, r2: Result): boolean;
}

export interface MapReduceTask<Input, Result> extends ReducableTask<Result> {
  /**
   * Is the first step of this task, which generates a Result from a given Input.
   * That Result(s) can then be reduced into a single Result via reduce()
   */
  map(t: Input): Promise<Result>;

  inputSerializer(): TaskSerializer<Input>;
}

export interface TaskSerializer<T> {
  toJSON(t: T): string;
  fromJSON(s: string): T;
}

export interface TaskPayload {
  // id: number,
  name: string;
  payload: string;
}
