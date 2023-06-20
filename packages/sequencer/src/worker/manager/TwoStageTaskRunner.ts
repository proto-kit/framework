import { MapReduceTaskRunner } from "./TaskRunner";
import { AbstractTask, MapReduceTask, PairedMapTask } from "./ReducableTask";
import { TaskQueue } from "../queue/TaskQueue";

const errors = {
  unknownTask: (name: string) => new Error(`Unknown response for taks: ${name}. Make sure the queue is only used by one runner. `)
}

export class TwoStageTaskRunner<
  ParamInput1, ParamOutput1,
  ParamInput2, ParamOutput2,
  AdditionalParams,
  Result
> extends MapReduceTaskRunner<[ParamOutput1, ParamOutput2, AdditionalParams], Result> {

  public constructor(
    messageQueue: TaskQueue,
    queueName: string,
    reducingTask: MapReduceTask<[ParamOutput1, ParamOutput2, AdditionalParams], Result>,
    private readonly firstStepTask: PairedMapTask<ParamInput1, ParamOutput1, ParamInput2, ParamOutput2>
  ) {
    super(messageQueue, reducingTask, queueName);
  }

  public async executeTwoStageMapReduce(
    inputs: [ParamInput1, ParamInput2, AdditionalParams][]
  ){
    // How handing this should work:
    // 1. Push all ParamInputs (1 and 2) as tasks and wait on them to be resolved in pairs
    // 2. Push the paired result tuples as tasks (normal map)
    // 3. Reduce

    const start = async (resolve: (type: Result) => void) => {

      const queue = this.queue!

      const firstStepSerializers = this.firstStepTask.serializers()
      const mapReduceInputSerializer = this.reducingTask.inputSerializer()

      // Collects all matching pairs of calculated inputs
      const stepOneQueue = Array(inputs.length)
        .fill(null)
        .map((x, index) => {
          return {
            output1: undefined as ParamOutput1 | undefined,
            output2: undefined as ParamOutput2 | undefined,
            params: inputs[index][2],
          };
        });

      // Checks if the given index has both outputs computed.
      // If so, push the mapping task to create first Result
      const checkPaired = async (index: number) => {
        const record = stepOneQueue[index]

        if(record.output1 !== undefined && record.output2 !== undefined){
          // Push map task (step 2)
          const payload = mapReduceInputSerializer.toJSON([record.output1!, record.output2!, record.params])
          await queue.addTask({
            name: `${this.task.name()}_map`,
            payload
          })
        }
      }

      // Add listener
      await queue.onCompleted(async (result) => {
        const { payload } = result;

        if(payload.name.startsWith(`${this.task.name()}_input1_`)){
          // Handle input1 result
          const index = Number.parseInt(payload.name.split("_").pop()!)
          stepOneQueue[index].output1 = firstStepSerializers.output1.fromJSON(payload.payload)

          await checkPaired(index)
        }else if(payload.name.startsWith(`${this.task.name()}_input2_`)){
          // Handle input2 result
          const index = Number.parseInt(payload.name.split("_").pop()!)
          stepOneQueue[index].output2 = firstStepSerializers.output2.fromJSON(payload.payload)

          await checkPaired(index)
        }else if(payload.name === `${this.task.name()}_map`){
          // Handle mapping result
          const parsedResult: Result = JSON.parse(payload.payload);

          await super.addInput(parsedResult);
        }else if (payload.name === this.task.name()) {
          // Handle reducing step
          await super.handleCompletedReducingStep(payload, resolve);
        }else{
          throw errors.unknownTask(payload.name)
        }
      })

      // Push inputs (step 1)
      const taskPushPromises = inputs.map(async (input, index) => {
        // Push input 1
        const promise1 = await queue.addTask({
          name: `${this.task.name()}_input1_${index}`,
          payload: firstStepSerializers.input1.toJSON(input[0])
        });
        // Push input 2
        const promise2 = await queue.addTask({
          name: `${this.task.name()}_input2_${index}`,
          payload: firstStepSerializers.input2.toJSON(input[1])
        });

        return Promise.all([promise1, promise2])
      }).flat(1);

      // Await all addTask() calls before continuing
      await Promise.all(taskPushPromises)
    }
    return await this.execute(start);
  }

}