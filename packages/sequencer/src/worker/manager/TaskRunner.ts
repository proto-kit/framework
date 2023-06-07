import { MapReduceTask, ReducableTask, TaskPayload, TaskSerializer } from "./ReducableTask";
import { Closeable, InstantiatedQueue, TaskQueue } from "../queue/TaskQueue";

/**
 * Task-runner that has the responsibility of pushing and coordinating the computing of a task with the corresponding inputs.
 *
 * This instance takes a ReduceableTask and runs it on a given TaskQueue
 */
export class ReducingTaskRunner<Type> implements Closeable{

  /**
   * @param messageQueue The connection object to the messageQueue
   * @param task The task definition to be executed
   * @param queueName The name of the queue on which the task should be executed (workers have to listen on that queue)
   */
  constructor(
    protected readonly messageQueue: TaskQueue,
    protected readonly task: ReducableTask<Type>,
    protected readonly queueName: string,
  ) {
    
  }

  protected serializer: TaskSerializer<Type> = this.task.serializer()
  protected queue?: InstantiatedQueue = undefined

  protected openCloseables: Closeable[] = [];

  // The queue of all inputs that aren't yet submitted in a task
  private pendingInputs: Type[] = []
  private runningTaskCount = 0

  public executeReduce(inputs: Type[]): Promise<Type> {

    return new Promise(async (resolve, reject) => {

      const queue = await this.messageQueue.getQueue(this.queueName);
      this.queue = queue;

      this.openCloseables.push(queue);

      await queue.onCompleted(async (result) => {
        let { jobId, payload } = result;
        await this.handleCompleted(payload, resolve);
      });

      this.pendingInputs = [...inputs]

      //Push initial tasks
      await this.pushAvailableReductions();
    })
  }

  protected async handleCompleted(payload: TaskPayload, resolve: (result: Type) => void) {
    let parsed = this.serializer.fromJSON(payload.payload);

    this.runningTaskCount--;

    this.pendingInputs.push(parsed);

    if (this.pendingInputs.length >= 2) {
      await this.pushAvailableReductions();
    } else if (this.runningTaskCount === 0 && this.pendingInputs.length === 1) {
      //Report result
      await this.queue!.close();
      resolve(this.pendingInputs[0]);
    } else {
      //Error
    }
  }

  protected async addInput(...inputs: Type[]){
    this.pendingInputs.push(...inputs)
    await this.pushAvailableReductions()
  }

  private async pushReduction(t1: Type, t2: Type) {
    const payload: TaskPayload = {
      name: this.task.name(),
      payload: JSON.stringify([this.serializer.toJSON(t1), this.serializer.toJSON(t2)]),
    };

    console.log("Pushed Reduction: " + JSON.stringify([t1, t2]));

    return await this.queue!.addTask(payload);
  }

  private resolveReducibleTasks(): { r1: Type; r2: Type }[] {
    let res: { r1: Type; r2: Type }[] = [];

    let pendingInputs = this.pendingInputs

    for (let i = 0; i < pendingInputs.length; i++) {
      let first = pendingInputs[i];
      let secondIndex = pendingInputs.findIndex((x, j) => {
        return j > i && this.task.reducible(first, x);
      });

      if (secondIndex > 0) {
        let second = pendingInputs[secondIndex];
        pendingInputs = pendingInputs.filter((_, j) => j !== i && j !== secondIndex);

        res.push({ r1: first, r2: second });
      }
    }

    this.pendingInputs = pendingInputs

    return res;
  }

  private async pushAvailableReductions() {
    let tasks = this.resolveReducibleTasks();

    for (let { r1, r2 } of tasks) {
      // We additionally need this count, because otherwise there would be a race condition to mark a task as completed, if we would do it via runningTasks
      this.runningTaskCount++;

      let job = await this.pushReduction(r1, r2);

      // runningTasks.push(job.jobId);
      // pushedTasks[job.jobId] = [r1, r2];
    }
  }

  async close(): Promise<void> {
    await Promise.all(this.openCloseables.map((x) => x.close()));
  }

}

export class MapReduceTaskRunner<Input, Result> extends ReducingTaskRunner<Result> {
  constructor(
    messageQueue: TaskQueue,
    task: MapReduceTask<Input, Result>,
    queueName: string,
  ) {
    super(messageQueue, task, queueName)
  }

  public executeMapReduce(inputs: Input[]): Promise<Result> {

    return new Promise(async (resolve, reject) => {

      const queue = await this.messageQueue.getQueue(this.queueName);
      this.queue = queue;

      this.openCloseables.push(queue);

      await queue.onCompleted(async (result) => {
        let { jobId, payload } = result;

        if (payload.name === this.task.name()) {

          await super.handleCompleted(payload, resolve)

        } else if(payload.name === this.task.name() + "_map"){
          const r: Result = JSON.parse(payload.payload)
          await super.addInput(r)
        }
      });

      let inputQueue = [...inputs]

      //Push initial tasks
      const initialPromises = inputQueue.map(input => {
        queue.addTask({
          name: this.task.name() + "_map",
          payload: JSON.stringify(input)
        })
      })
      await Promise.all(initialPromises)
    })
  }
}