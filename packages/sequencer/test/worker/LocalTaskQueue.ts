import { Closeable, InstantiatedQueue, TaskQueue } from "../../src/worker/queue/TaskQueue";
import { TaskPayload } from "../../src/worker/manager/ReducableTask";

export class LocalTaskQueue implements TaskQueue {

  constructor(private readonly simulatedDuration: number) {
  }

  queues: { [key: string]: { payload: TaskPayload, jobId: string }[] } = {};
  workers: { [key: string]: { busy: boolean, f: (data: TaskPayload) => Promise<TaskPayload> } } = {}
  listeners: ((result: { jobId: string; payload: TaskPayload }) => Promise<void>)[] = []

  workNextTasks() {
    Object.entries(this.queues).forEach(queue => {
      const tasks = queue[1]
      if(tasks.length > 0){
        tasks.forEach(task => {
          this.workers[queue[0]].f(task.payload).then(result => {
            this.listeners.forEach((listener) => listener({ payload: result, jobId: task.jobId }));
          })
        })
      }
      this.queues[queue[0]] = []
    })
  }

  async getQueue(name: string): Promise<InstantiatedQueue> {
    this.queues[name] = [];

    let id = 0

    const listeners = this.listeners
    const thisClojure = this

    return {
      async addTask(payload: TaskPayload): Promise<{ jobId: string }> {
        const nextId = id++ + ""
        thisClojure.queues[name].push( { payload, jobId: nextId })

        thisClojure.workNextTasks()

        return { jobId: nextId }
      },

      async onCompleted(
        listener: (result: { jobId: string; payload: TaskPayload }) => Promise<void>
      ): Promise<void> {
        listeners.push(listener)
      },

      close(): Promise<void> {
        return Promise.resolve()
      },
    };
  }

  createWorker(name: string, executor: (data: TaskPayload) => Promise<TaskPayload>): Closeable {
    this.workers[name] = {
      busy: false,
      f: async (data: TaskPayload) => {
        await sleep(this.simulatedDuration)

        return await executor(data)
      }
    };
    this.workNextTasks()
    return {
      close: async () => {}
    }
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));