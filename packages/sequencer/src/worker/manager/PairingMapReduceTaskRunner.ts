import { MapReduceTaskRunner } from "./TaskRunner";
import { AbstractTask, MappingTask, MapReduceTask, PairedMapTask } from "./ReducableTask";
import { TaskQueue } from "../queue/TaskQueue";

const errors = {
  unknownTask: (name: string) =>
    new Error(
      `Unknown response for taks: ${name}. Make sure the queue is only used by one runner.`
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
    protected readonly task: {
      reducingTask: MapReduceTask<
        PairingDerivedInput<Output1, Output2, AdditionalParameters>,
        Result
      >,
      firstPairing: MappingTask<Input1, Output1>,
      secondPairing: MappingTask<Input2, Output2>,
    }
  ) {
    super(messageQueue, task.reducingTask, queueName);
  }

  public async executeTwoStageMapReduce(
    inputs: [Input1, Input2, AdditionalParameters][]
  ) {
    // How handing this should work:
    // 1. Push all ParamInputs (1 and 2) as tasks and wait on them to be resolved in pairs
    // 2. If a pairing is completed, push the paired result tuples as tasks (normal map)
    // 3. Reduce

    const start = async (resolve: (type: Result) => void) => {
      const queue = this.queue!;

      const pairingSerializers = {
        input1: this.task.firstPairing.inputSerializer(),
        output1: this.task.firstPairing.resultSerializer(),
        input2: this.task.secondPairing.inputSerializer(),
        output2: this.task.secondPairing.resultSerializer(),
      };
      const mapReduceInputSerializer = this.reducingTask.inputSerializer();

      // Collects all matching pairs of calculated inputs
      const stepOneQueue = Array(inputs.length)
        .fill(undefined)
        .map<{ pairing1?: Output1; pairing2?: Output2; params: AdditionalParameters }>((x, index) => ({
          pairing1: undefined,
          pairing2: undefined,
          params: inputs[index][2],
        }));

      // TODO Replace index with string

      // Checks if the given index has both outputs computed.
      // If so, push the mapping task to create first Result
      const checkPaired = async (index: number) => {
        const record = stepOneQueue[index];

        if (record.pairing1 !== undefined && record.pairing2 !== undefined) {
          // Push map task (step 2)
          const payload = mapReduceInputSerializer.toJSON({
            input1: record.pairing1,
            input2: record.pairing2,
            params: record.params,
          });

          await queue.addTask({
            name: this.task.reducingTask.name(),
            payload,
          });
        }
      };

      // Add listener
      await queue.onCompleted(async (result) => {
        const { payload } = result;

        if (payload.name.startsWith(this.task.firstPairing.name())) {
          // Handle input1 result
          const index = parseInt(payload.name.split("_").pop()!);
          stepOneQueue[index].pairing1 = pairingSerializers.output1.fromJSON(
            payload.payload
          );

          await checkPaired(index);
        } else if (payload.name.startsWith(this.task.secondPairing.name())) {
          // Handle input2 result
          const index = parseInt(payload.name.split("_").pop()!);
          stepOneQueue[index].pairing2 = pairingSerializers.output2.fromJSON(
            payload.payload
          );

          await checkPaired(index);
        } else if (payload.name === this.task.reducingTask.name()) {
          // Handle mapping result
          const parsedResult: Result = JSON.parse(payload.payload);

          await super.addInput(parsedResult);
        } else if (payload.name === `${this.task.reducingTask.name()}_reduce`) {
          // Handle reducing step
          await super.handleCompletedReducingStep(payload, resolve);
        } else {
          throw errors.unknownTask(payload.name);
        }
      });

      // Push inputs (step 1)
      const taskPushPromises = inputs.flatMap(async (input, index) => {
        // Push input 1
        const promise1 = await queue.addTask({
          name: `${this.task.firstPairing.name()}_${index}`,
          payload: pairingSerializers.input1.toJSON(input[0]),
        });
        // Push input 2
        const promise2 = await queue.addTask({
          name: `${this.task.secondPairing.name()}_${index}`,
          payload: pairingSerializers.input2.toJSON(input[1]),
        });

        return await Promise.all([promise1, promise2]);
      });

      // Await all addTask() calls before continuing
      await Promise.all(taskPushPromises);
    };
    return await this.execute(start);
  }
}
