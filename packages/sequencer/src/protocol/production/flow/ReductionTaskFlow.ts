import { Flow, FlowCreator } from "../../../worker/flow/Flow";
import { Task } from "../../../worker/flow/Task";
import { PairTuple } from "../../../helpers/utils";
import { log } from "@proto-kit/common";

interface ReductionState<Output> {
  numMergesCompleted: 0;
  queue: Output[];
}

export class ReductionTaskFlow<Input, Output> {
  private flow: Flow<ReductionState<Output>>;

  public constructor(
    private options: {
      name: string;
      inputLength: number;
      mappingTask: Task<Input, Output>;
      reductionTask: Task<PairTuple<Output>, Output>;
      mergableFunction: (a: Output, b: Output) => boolean;
    },
    private flowCreator: FlowCreator
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

    const touchedIndizes: number[] = [];

    for (const [index, first] of pendingInputs.entries()) {
      const secondIndex = pendingInputs.findIndex(
        (second, index2) =>
          index2 > index &&
          (reducible(first, second) || reducible(second, first))
      );

      if (secondIndex > 0) {
        const r2 = pendingInputs[secondIndex];
        pendingInputs = pendingInputs.filter(
          (unused, index2) => index2 !== index && index2 !== secondIndex
        );

        const [firstElement, secondElement] = reducible(first, r2)
          ? [first, r2]
          : [r2, first];

        res.push({ r1: firstElement, r2: secondElement });
        touchedIndizes.push(index, secondIndex);
      }
    }

    return { availableReductions: res, touchedIndizes };
  }

  private async resolveReduction() {
    const { flow, options } = this;

    if (
      options.inputLength - flow.state.numMergesCompleted === 1 &&
      flow.tasksInProgress === 0
    ) {
      log.info(`${this.options.name}: Resolved successfully`)
      flow.resolve(flow.state.queue[0]);
      return;
    }
    log.info(`${this.options.name}: Queue length: ${flow.state.queue.length}`)

    if (flow.state.queue.length >= 2) {
      const { availableReductions, touchedIndizes } =
        this.resolveReducibleTasks(flow.state.queue, options.mergableFunction);

      // I don't know exactly what this rule wants from me, I suspect
      // it complains bcs the function is called forEach
      // eslint-disable-next-line unicorn/no-array-method-this-argument
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

  private started = false;

  public async execute(inputs: Input[] = []): Promise<Output> {
    this.started = true;
    return await this.flow.withFlow<Output>(async (resolve, reject) => {
      inputs.forEach((input) => {
        this.pushInput(input);
      });
    });
  }

  private async initCompletionCallback(callback: (output: Output) => Promise<void>){
    const result = await this.flow.withFlow<Output>(async (resolve, reject) => {
    });
    await callback(result);
  }

  public onCompletion(callback: (output: Output) => Promise<void>) {
    void this.initCompletionCallback(callback);
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
