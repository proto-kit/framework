import { MapReduceTaskRunner } from "./MapReduceTaskRunner";
import { MappingTask, MapReduceTask, TaskPayload } from "./ReducableTask";
import { TaskQueue } from "../queue/TaskQueue";

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
 * What is a "pairing"?
 * A pairing is defined as a set of two tasks that have to be matched 1:1 and
 * need to be both completed before a result will be returned and followup
 * actions are triggered
 */
export class PairingMapReduceTaskRunner<
  Input1,
  Output1,
  Input2,
  Output2,
  AdditionalParameters,
  Result
> extends MapReduceTaskRunner<
  PairingDerivedInput<Output1, Output2, AdditionalParameters>,
  Result
> {
  public constructor(
    messageQueue: TaskQueue,
    queueName: string,

    // eslint-disable-next-line max-len
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
    taskIdGenerator: (input: Input1, index: number) => string
  ) {
    return inputs.reduce<
      PairingCollector<Output1, Output2, AdditionalParameters>
    >((agg, input, index) => {
      agg[taskIdGenerator(input[0], index)] = {
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
   * @param taskIdGenerator A function that generates unique identifiers
   * to identify submitted tasks.
   */
  public async executeTwoStageMapReduce(
    inputs: [Input1, Input2, AdditionalParameters][],
    // Not sure about this yet, maybe putt this in the input array?
    taskIdGenerator: (input: Input1, index: number) => string
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
      const mapReduceInputSerializer = this.task.reducingTask.inputSerializer();

      // Collects all matching pairs of calculated inputs
      const pairingCollector = this.createNewPairingCollector(
        inputs,
        taskIdGenerator
      );

      // Add listener
      await queue.onCompleted(async (result) => {
        const { payload } = result;

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
              });
            }

            break;
          }
          case task.reducingTask.name(): {
            // Handle mapping result and delegate new input to MapReduceRunner
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const parsedResult: Result = JSON.parse(payload.payload);

            await super.addInput(parsedResult);

            break;
          }
          case `${task.reducingTask.name()}_reduce`: {
            // Handle reducing step
            await super.handleCompletedReducingStep(payload, resolve);

            break;
          }
          default: {
            throw errors.unknownTask(payload.name);
          }
        }
      });

      // Push inputs (step 1)
      const taskPushPromises = inputs.flatMap(async (input, index) => {
        const taskId = taskIdGenerator(input[0], index);

        // Push input 1
        const promise1 = await queue.addTask({
          name: task.firstPairing.name(),
          payload: pairingSerializers.input1.toJSON(input[0]),
          taskId,
        });
        // Push input 2
        const promise2 = await queue.addTask({
          name: task.secondPairing.name(),
          payload: pairingSerializers.input2.toJSON(input[1]),
          taskId,
        });

        return await Promise.all([promise1, promise2]);
      });

      // Await all addTask() calls before continuing
      await Promise.all(taskPushPromises);
    };
    return await this.execute(start);
  }
}
