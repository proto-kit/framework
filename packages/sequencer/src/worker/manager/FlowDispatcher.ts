import { InstantiatedQueue, TaskQueue } from "../queue/TaskQueue";
import { inject } from "tsyringe";
import { DispatchableFlow } from "./DispatchableFlow";
import { TaskPayload } from "./ReducableTask";
import { noop } from "@yab/protocol";

// class ProxiedTaskQueue implements InstantiatedQueue{
//   constructor(private readonly queue: InstantiatedQueue) {
//   }
//
//   public async addTask(payload: TaskPayload): Promise<{ taskId: string }> {
//     return await this.queue.addTask(payload);
//   }
//
//   public close(): Promise<void> {
//     return Promise.resolve(undefined);
//   }
//
//   public name = this.queue.name;
//
//   private listeners: ((payload: TaskPayload) => Promise<void>)[] = []
//
//   public async onCompleted(listener: (payload: TaskPayload) => Promise<void>): Promise<void> {
//     this.listeners.push(listener);
//   }
//
//   public async relayMessage(
//     payload: TaskPayload
//   ): Promise<void> {
//     await Promise.all(
//       this.listeners.map(fn => fn(payload))
//     )
//   }
// }
//
// /**
//  *
//  */
// export class FlowDispatcher {
//   private queues: Record<string, InstantiatedQueue> = {}
//   // Mapping queueName => (flowId => ProxiedTaskQueue)
//   private flows: Record<string, Record<string, ProxiedTaskQueue>> = {}
//   // Mapping queueName => flowId
//   // private flowQueues: Record<string, string> = {}
//
//   public constructor(
//     @inject("TaskQueue") private readonly taskQueue: TaskQueue
//   ) {
//   }
//
//   private currentFlowId = 0;
//
//   private generateFlowId(): string{
//     this.currentFlowId += 1;
//     return String(this.currentFlowId);
//   }
//
//   private async queueMessageReceived(
//     queueName: string,
//     message: TaskPayload
//   ): Promise<void>{
//     const flows = this.flows[queueName];
//     const queue = flows[message.flowId]
//     await queue.relayMessage(message);
//   }
//
//   public async executeFlow<Result>(
//     queueName: string,
//     flow: DispatchableFlow<Result>,
//     flowId?: string
//   ): Promise<Result> {
//     if(this.queues[queueName] === undefined){
//       const queueConnection = await this.taskQueue.getQueue(queueName);
//       queueConnection.onCompleted()
//       this.queues[queueName] = queueConnection;
//     }
//
//     const newFlowId = flowId ?? this.generateFlowId();
//
//     const proxiedQueue = new ProxiedTaskQueue(this.queues[queueName]);
//
//     const promise = new Promise<Result>((resolve, reject) => {
//       // Create proxied resolve function so that we can close connections if needed
//       const proxiedResolve = (result: Result) => {
//         this.closeFlow(newFlowId)
//         resolve(result);
//       }
//
//       flow.executeFlow(newFlowId, proxiedResolve, proxiedQueue)
//         // Do we need then()?
//         // eslint-disable-next-line promise/prefer-await-to-then
//         .then(noop)
//         // eslint-disable-next-line promise/prefer-await-to-then
//         .catch((error: unknown) => {
//           reject(error);
//         });
//     });
//
//     (this.flows[queueName] ??= []).push(flow);
//
//     return await promise;
//   }
//
//   public closeFlow(flowId: string){
//     const flow = this.flows[flowId];
//
//     // TODO
//   }
//
// }