import {
  UnprovenBlock,
  Task,
  TaskSerializer,
  UnprovenBlockStorage,
} from "@proto-kit/sequencer";
import { inject, injectable } from "tsyringe";

import { IndexBlockTaskParametersSerializer } from "./IndexBlockTaskParameters";

@injectable()
export class IndexBlockTask implements Task<UnprovenBlock, void> {
  public name = "index-block";

  public constructor(
    public taskSerializer: IndexBlockTaskParametersSerializer,
    @inject("UnprovenBlockStorage") public blockStorage: UnprovenBlockStorage
  ) {}

  public async prepare(): Promise<void> {
    throw new Error("Not implemented");
  }

  public async compute(input: UnprovenBlock): Promise<void> {
    this.blockStorage.pushBlock(input);
  }

  public inputSerializer(): TaskSerializer<UnprovenBlock> {
    return this.taskSerializer;
  }

  public resultSerializer(): TaskSerializer<void> {
    throw new Error("Not implemented");
  }
}
