import { log } from "@proto-kit/common";

import { TaskQueue } from "../queue/TaskQueue";

import { MapReduceFlow, TASKS_REDUCE_SUFFIX } from "./MapReduceFlow";
import { MappingTask, MapReduceTask } from "./ReducableTask";

const errors = {
  unknownTask: (name: string) =>
    new Error(
      `Unknown response for taks: ${name}. Make sure the queue is only used by one runner.`
    ),

  taskIdNotSet: () =>
    new Error(
      "TaskId for pairing payload not set, won't be able to find match"
    ),
};

/**
 *  This type is used to consistently define the input type of a MapReduce flow
 *  that is depenend on the result a pairing.
 */
export interface PairingDerivedInput<Input1, Input2, AdditionalParameters> {
  input1: Input1;
  input2: Input2;
  params: AdditionalParameters;
}

interface PairingCollector<Output1, Output2, AdditionalParameters> {
  [key: string]: {
    pairing1?: Output1;
    pairing2?: Output2;
    params: AdditionalParameters;
  };
}

/**
 * This is a task runner that extends the functionality of the
 * MapReduceTaskRunner with the ability to perform an extra step
 * called "pairing" before starting the map-reduce.
 *
 * The pairing is an extra step with 2 distinct and seperated tasks
 * that get executed independently, but then the two results together
 * are in turn used as an input for Map-Reduce flow that then gets
 * processed normally.
 *
 * What is a "pairing"?
 * A pairing is defined as a set of two tasks that have to be matched 1:1 and
 * need to be both completed before a result will be returned and followup
 * actions are triggered
 */
export class PairingMapReduceFlow<
  Input1,
  Output1,
  Input2,
  Output2,
  AdditionalParameters,
  Result,
> extends MapReduceFlow<
  PairingDerivedInput<Output1, Output2, AdditionalParameters>,
  Result
> {
  public constructor(
    messageQueue: TaskQueue,
    queueName: string,

    // Set of tasks that implement the execution described by the Pairing-Map-Reduce flow
    protected readonly task: {
      reducingTask: MapReduceTask<
        PairingDerivedInput<Output1, Output2, AdditionalParameters>,
        Result
      >;
      firstPairing: MappingTask<Input1, Output1>;
      secondPairing: MappingTask<Input2, Output2>;
    }
  ) {
    super(messageQueue, task.reducingTask, queueName);
  }

  private assertTaskIdSet(
    taskId: string | undefined
  ): asserts taskId is string {
    if (taskId === undefined) {
      throw errors.taskIdNotSet();
    }
  }

  /**
   * Create a new empty collection object for collecting the pairing results
   * and determining if both sides have results
   */
  private createNewPairingCollector(
    inputs: [Input1, Input2, AdditionalParameters][],
    taskIds: string[]
  ) {
    return inputs.reduce<
      PairingCollector<Output1, Output2, AdditionalParameters>
    >((agg, input, index) => {
      agg[taskIds[index]] = {
        pairing1: undefined,
        pairing2: undefined,
        params: input[2],
      };
      return agg;
    }, {});
  }

  /**
   * Checks if the given pairing has both outputs computed
   * (i.e. results have been received).
   * If so, return a new task that is in turn an input for the map-reduce flow.
   */
  private checkPaired(
    pairingCollector: PairingCollector<Output1, Output2, AdditionalParameters>,
    taskId: string
  ) {
    const record = pairingCollector[taskId];

    if (record.pairing1 !== undefined && record.pairing2 !== undefined) {
      // Push map task (step 2)
      return {
        input1: record.pairing1,
        input2: record.pairing2,
        params: record.params,
      };
    }
    return undefined;
  }

  /**
   *
   * @param inputs Set of inputs
   * @param taskIds A array that containes unique IDs for each input
   * to identify submitted tasks.
   */
  public async executePairingMapReduce(
    flowId: string,
    inputs: [Input1, Input2, AdditionalParameters][],
    taskIds: string[]
  ) {
    // How handing this should work:
    // 1. Push all Inputs as tasks and wait on them to be resolved in pairs
    // 2. If a pairing is completed,
    //    push the paired result tuples as tasks (normal map)
    // 3. Reduce

    const start = async (resolve: (type: Result) => void) => {
      const { queue, task } = this;
      this.assertQueueNotNull(queue);

      const pairingSerializers = {
        input1: task.firstPairing.inputSerializer(),
        output1: task.firstPairing.resultSerializer(),
        input2: task.secondPairing.inputSerializer(),
        output2: task.secondPairing.resultSerializer(),
      };
      const mapReduceInputSerializer = task.reducingTask.inputSerializer();
      const mapReduceOutputSerializer = task.reducingTask.resultSerializer();

      // Collects all matching pairs of calculated inputs
      const pairingCollector = this.createNewPairingCollector(inputs, taskIds);

      // Add listener
      this.onCompletedListeners[flowId] = async (payload) => {
        log.debug(
          `Got payload name: ${payload.name} with id ${payload.taskId ?? "-"}`
        );
        switch (payload.name) {
          // This case gets triggered when a result of a pair-task comes back
          case task.firstPairing.name():
          case task.secondPairing.name(): {
            this.assertTaskIdSet(payload.taskId);

            if (payload.name === task.firstPairing.name()) {
              // Handle input1 result
              pairingCollector[payload.taskId].pairing1 =
                pairingSerializers.output1.fromJSON(payload.payload);
            } else {
              // Handle input2 result
              pairingCollector[payload.taskId].pairing2 =
                pairingSerializers.output2.fromJSON(payload.payload);
            }

            const resultingTask = this.checkPaired(
              pairingCollector,
              payload.taskId
            );

            if (resultingTask !== undefined) {
              await queue.addTask({
                name: task.reducingTask.name(),
                payload: mapReduceInputSerializer.toJSON(resultingTask),
                flowId,
              });
            }

            break;
          }
          case task.reducingTask.name(): {
            // Handle mapping result and delegate new input to MapReduceRunner
            const parsedResult: Result = mapReduceOutputSerializer.fromJSON(
              payload.payload
            );

            // This should prevent a non-resolvablility issue when you only have
            // one input pair and therefore there will be no reduction step
            if (inputs.length === 1) {
              resolve(parsedResult);
              return;
            }

            await super.addInput(flowId, parsedResult);

            break;
          }
          case `${task.reducingTask.name()}${TASKS_REDUCE_SUFFIX}`: {
            await super.handleCompletedReducingStep(flowId, payload, resolve);
            break;
          }
          default: {
            throw errors.unknownTask(payload.name);
          }
        }
      };

      // Push inputs (step 1)
      const taskPushPromises = inputs.flatMap(async (input, index) => {
        const taskId = taskIds[index];

        // Push first pairing element
        const promise1 = await queue.addTask({
          name: task.firstPairing.name(),
          payload: pairingSerializers.input1.toJSON(input[0]),
          taskId,
          flowId,
        });
        // Push second pairing element
        const promise2 = await queue.addTask({
          name: task.secondPairing.name(),
          payload: pairingSerializers.input2.toJSON(input[1]),
          taskId,
          flowId,
        });

        return await Promise.all([promise1, promise2]);
      });

      // Await all addTask() calls before continuing
      await Promise.all(taskPushPromises);
    };
    return await this.executeFlowWithQueue(flowId, start);
  }
}
