import {
  Task,
  TaskSerializer,
  UnprovenBlockWithMetadata,
} from "@proto-kit/sequencer";
import { inject, injectable } from "tsyringe";

import { UnprovenBlockStorage } from "../storage/repositories/UnprovenBlockStorage";

import { IndexBlockTaskParametersSerializer } from "./IndexBlockTaskParameters";

@injectable()
export class IndexBlockTask implements Task<UnprovenBlockWithMetadata, void> {
  public name = "index-block";

  public constructor(
    public taskSerializer: IndexBlockTaskParametersSerializer,
    @inject("UnprovenBlockStorage")
    public unprovenBlockStorage: UnprovenBlockStorage
  ) {}

  public async prepare(): Promise<void> {
    throw new Error("Not implemented");
  }

  public async compute(input: UnprovenBlockWithMetadata): Promise<void> {
    this.unprovenBlockStorage.pushBlock(input);
  }

  public inputSerializer(): TaskSerializer<UnprovenBlockWithMetadata> {
    return this.taskSerializer;
  }

  public resultSerializer(): TaskSerializer<void> {
    throw new Error("Not implemented");
  }
}
