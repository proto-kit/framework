import { log } from "@proto-kit/common";

import { Flow, FlowCreator } from "../../../worker/flow/Flow";
import { Task } from "../../../worker/flow/Task";
import { PairTuple } from "../../../helpers/utils";

interface ReductionState<Output> {
  numMergesCompleted: 0;
  queue: Output[];
}

/**
 *  This type is used to consistently define the input type of a MapReduce flow
 *  that is depenend on the result a pairing.
 */
export interface PairingDerivedInput<Input1, Input2, AdditionalParameters> {
  input1: Input1;
  input2: Input2;
  params: AdditionalParameters;
}

/**
 * This class builds and executes a flow that follows the map-reduce pattern.
 * This works in 2 steps:
 * 1. Mapping: Execute the mappingTask to transform from Input -> Output
 * 2. Reduction: Find suitable pairs and merge them [Output, Output] -> Output
 *
 * We use this pattern extensively in our pipeline,
 */
export class ReductionTaskFlow<Input, Output> {
  private readonly flow: Flow<ReductionState<Output>>;

  private started = false;

  private parentFlow?: Flow<unknown>;

  public constructor(
    private readonly options: {
      name: string;
      inputLength: number;
      mappingTask: Task<Input, Output>;
      reductionTask: Task<PairTuple<Output>, Output>;
      mergableFunction: (a: Output, b: Output) => boolean;
    },
    private readonly flowCreator: FlowCreator
  ) {
    this.flow = flowCreator.createFlow<ReductionState<Output>>(options.name, {
      numMergesCompleted: 0,
      queue: [],
    });
  }

  private resolveReducibleTasks<Type>(
    pendingInputs: Type[],
    reducible: (a: Type, b: Type) => boolean
  ): {
    availableReductions: { r1: Type; r2: Type }[];
    touchedIndizes: number[];
  } {
    const res: { r1: Type; r2: Type }[] = [];

    let remainingInputs = pendingInputs;

    const touchedIndizes: number[] = [];

    for (const [index, first] of remainingInputs.entries()) {
      const secondIndex = remainingInputs.findIndex(
        (second, index2) =>
          index2 > index &&
          (reducible(first, second) || reducible(second, first))
      );

      if (secondIndex > 0) {
        const r2 = remainingInputs[secondIndex];
        remainingInputs = remainingInputs.filter(
          (unused, index2) => index2 !== index && index2 !== secondIndex
        );

        const [firstElement, secondElement] = reducible(first, r2)
          ? [first, r2]
          : [r2, first];

        res.push({ r1: firstElement, r2: secondElement });
        touchedIndizes.push(index, secondIndex);
      }
    }

    // Print error if the flow is stuck if
    // 1. no tasks are in progress still
    // 2. and not every queue element has been resolved
    // 3. and all inputs have been pushed to the task already
    const queueSize = this.flow.state.queue.length;
    if (
      this.flow.tasksInProgress === 0 &&
      res.length * 2 < queueSize &&
      this.flow.state.numMergesCompleted + res.length * 2 + queueSize ===
        this.options.inputLength
    ) {
      log.error(
        `Flow ${this.flow.flowId} seems to have halted with ${this.flow.state.queue.length} elements left in the queue`
      );
    }

    return { availableReductions: res, touchedIndizes };
  }

  private async resolveReduction() {
    const { flow, options } = this;

    if (
      options.inputLength - flow.state.numMergesCompleted === 1 &&
      flow.tasksInProgress === 0
    ) {
      log.trace(`${options.name}: Resolved successfully`);
      flow.resolve(flow.state.queue[0]);
      return;
    }
    log.trace(`${options.name}: Queue length: ${flow.state.queue.length}`);

    if (flow.state.queue.length >= 2) {
      const { availableReductions, touchedIndizes } =
        this.resolveReducibleTasks(flow.state.queue, options.mergableFunction);

      // I don't know exactly what this rule wants from me, I suspect
      // it complains bcs the function is called forEach
      await flow.forEach(availableReductions, async (reduction) => {
        const taskParameters: PairTuple<Output> = [reduction.r1, reduction.r2];
        await flow.pushTask(
          options.reductionTask,
          taskParameters,
          async (result) => {
            flow.state.queue.push(result);
            flow.state.numMergesCompleted += 1;
            await this.resolveReduction();
          }
        );
      });

      flow.state.queue = flow.state.queue.filter(
        (ignored, index) => !touchedIndizes.includes(index)
      );
    }
  }

  private async initCompletionCallback(
    callback: (output: Output) => Promise<void>
  ) {
    if (this.started) {
      throw new Error("Flow already started, use pushInput() to add inputs");
    }
    this.started = true;
    try {
      const result = await this.flow.withFlow<Output>(async () => {});

      await callback(result);
    } catch (e: unknown) {
      if (e instanceof Error) {
        if (this.parentFlow !== undefined) {
          this.parentFlow.reject(e);
        } else {
          this.flow.reject(e);
        }
      } else {
        throw new Error(`Non-Error caught: ${e}`);
      }
    }
  }

  /**
   * Execute the flow using a callback method that is invoked upon
   * completion of the flow.
   * Push inputs using pushInput()
   * @param callback
   */
  public onCompletion(callback: (output: Output) => Promise<void>) {
    void this.initCompletionCallback(callback);
  }

  /**
   * To be used in conjunction with onCompletion
   * It allows errors from this flow to be "defered" to another parent
   * flow which might be properly awaited and therefore will throw the
   * error up to the user
   * @param flow
   */
  public deferErrorsTo(flow: Flow<unknown>) {
    this.parentFlow = flow;
  }

  /**
   * Execute the flow using the returned Promise that resolved when
   * the flow is finished
   * @param inputs initial inputs - doesnt have to be the complete set of inputs
   */
  public async execute(inputs: Input[] = []): Promise<Output> {
    if (this.started) {
      throw new Error("Flow already started, use pushInput() to add inputs");
    }
    this.started = true;
    return await this.flow.withFlow<Output>(async () => {
      await this.flow.forEach(inputs, async (input) => {
        await this.pushInput(input);
      });
    });
  }

  public async pushInput(input: Input) {
    await this.flow.pushTask(
      this.options.mappingTask,
      input,
      async (result) => {
        if (this.options.inputLength === 1) {
          this.flow.resolve(result);
        } else {
          this.flow.state.queue.push(result);
          await this.resolveReduction();
        }
      }
    );
  }
}
