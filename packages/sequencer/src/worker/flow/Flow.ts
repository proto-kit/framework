import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import { log } from "@proto-kit/common";

import { Closeable, InstantiatedQueue, TaskQueue } from "../queue/TaskQueue";

import { Task, TaskPayload } from "./Task";

const errors = {
  resolveNotDefined: () =>
    new Error(
      "The resolve callback has not been initialized yet. Call .withFlow() first!"
    ),
};

@injectable()
// ResolutionScoped => We want a new instance every time we resolve it
@scoped(Lifecycle.ResolutionScoped)
export class ConnectionHolder implements Closeable {
  private queues: {
    [key: string]: InstantiatedQueue;
  } = {};

  private listeners: {
    [key: string]: {
      [key: string]: (payload: TaskPayload) => Promise<void>;
    };
  } = {};

  public constructor(
    @inject("TaskQueue") private readonly queueImpl: TaskQueue
  ) {}

  public registerListener(
    flowId: string,
    queue: string,
    listener: (payload: TaskPayload) => Promise<void>
  ) {
    if (this.listeners[queue] === undefined) {
      this.listeners[queue] = {};
    }
    this.listeners[queue][flowId] = listener;
  }

  public unregisterListener(flowId: string, queue: string) {
    delete this.listeners[queue][flowId];
  }

  private async openQueue(name: string): Promise<InstantiatedQueue> {
    const queue = await this.queueImpl.getQueue(name);
    await queue.onCompleted(async (payload) => {
      await this.onCompleted(name, payload);
    });
    return queue;
  }

  private async onCompleted(name: string, payload: TaskPayload) {
    const listener = this.listeners[name]?.[payload.flowId];
    if (listener !== undefined) {
      await listener(payload);
    }
  }

  public async getQueue(name: string) {
    if (this.queues[name] !== undefined) {
      return this.queues[name];
    }
    const queue = await this.openQueue(name);
    this.queues[name] = queue;
    return queue;
  }

  async close() {
    // TODO
  }
}

interface CompletedCallback<Input, Result> {
  (result: Result, originalInput: Input): Promise<any>;
}

export class Flow<State> implements Closeable {
  // Indicates whether this flow has received one error and has
  // therefore cancelled
  private erroredOut = false;

  private readonly registeredListeners: string[] = [];

  private resultsPending: {
    [key: string]: (payload: TaskPayload) => Promise<void>;
  } = {};

  private taskCounter = 0;

  private resolveFunction?: (result: any) => void;

  private errorFunction?: (error: Error) => void;

  public tasksInProgress = 0;

  public constructor(
    private readonly connectionHolder: ConnectionHolder,
    public readonly flowId: string,
    public state: State
  ) {}

  private waitForResult(
    queue: string,
    taskId: string,
    callback: (payload: TaskPayload) => Promise<void>
  ) {
    this.resultsPending[taskId] = callback;

    if (!this.registeredListeners.includes(queue)) {
      // Open Listener onto Connectionhandler
      this.connectionHolder.registerListener(
        this.flowId,
        queue,
        async (payload) => {
          await this.resolveResponse(payload);
        }
      );
      this.registeredListeners.push(queue);
    }
  }

  public resolve<Result>(result: Result) {
    if (this.resolveFunction === undefined) {
      throw errors.resolveNotDefined();
    }
    this.resolveFunction(result);
  }

  public reject(error: Error) {
    this.erroredOut = true;
    this.errorFunction?.(error);
  }

  private async resolveResponse(response: TaskPayload) {
    if (response.taskId !== undefined) {
      const resolveFunction = this.resultsPending[response.taskId];

      if (!this.erroredOut) {
        if (response.status === "error") {
          this.reject(
            new Error(
              `Error in worker: ${response.payload}, task: ${response.flowId}:${response.taskId}`
            )
          );
          return;
        }

        if (resolveFunction !== undefined) {
          delete this.resultsPending[response.taskId];
          await resolveFunction(response);
        }
      }
    }
  }

  public async pushTask<Input, Result>(
    task: Task<Input, Result>,
    input: Input,
    completed?: CompletedCallback<Input, Result>,
    overrides?: {
      taskName?: string;
    }
  ): Promise<void> {
    const queueName = task.name;
    const taskName = overrides?.taskName ?? task.name;
    const queue = await this.connectionHolder.getQueue(queueName);

    const payload = await task.inputSerializer().toJSON(input);

    this.taskCounter += 1;
    const taskId = String(this.taskCounter);

    log.trace(`Pushing task ${task.name}`);

    await queue.addTask({
      name: taskName,
      taskId,
      flowId: this.flowId,
      payload,
    });

    this.tasksInProgress += 1;

    const callback = async (returnPayload: TaskPayload) => {
      log.trace(
        `Completed ${returnPayload.name}, task: ${returnPayload.flowId}:${
          returnPayload?.taskId ?? "-"
        }`
      );
      const decoded = await task
        .resultSerializer()
        .fromJSON(returnPayload.payload);
      this.tasksInProgress -= 1;
      return await completed?.(decoded, input);
    };
    this.waitForResult(queueName, taskId, callback);
  }

  public async forEach<Type>(
    inputs: Type[],
    fun: (input: Type, index: number, array: Type[]) => Promise<void>
  ) {
    const promises = inputs.map(fun);
    await Promise.all(promises);
  }

  public async withFlow<Result>(
    executor: (
      resolve: (result: Result) => void,
      reject: (reason: any) => void
    ) => Promise<void>
  ): Promise<Result> {
    return await new Promise<Result>((resolve, reject) => {
      this.resolveFunction = resolve;
      this.errorFunction = reject;
      void executor(resolve, reject);
    });
  }

  public async close() {
    this.registeredListeners.forEach((queue) => {
      this.connectionHolder.unregisterListener(this.flowId, queue);
    });
  }
}

@injectable()
export class FlowCreator {
  public constructor(private readonly connectionHolder: ConnectionHolder) {}

  public createFlow<State>(flowId: string, state: State): Flow<State> {
    return new Flow(this.connectionHolder, flowId, state);
  }
}
