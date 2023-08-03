import { Closeable, InstantiatedQueue } from "../queue/TaskQueue";

export interface DispatchableFlow<Result> extends Closeable {
  // executeFlow: (flowId: string, resolve: (type: Result) => void, taskQueue: InstantiatedQueue) => Promise<void>;
  executeFlow(flowId: string): Promise<Result>
}
