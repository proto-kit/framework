import { UnprovenBlock, Task, TaskSerializer } from "@proto-kit/sequencer";
import { BlockMapper } from "@proto-kit/persistance";
import { injectable } from "tsyringe";

@injectable()
export class IndexBlockTask implements Task<UnprovenBlock, void> {
  public name = "index-block";

  public constructor(public blockMapper: BlockMapper) {}

  public async prepare(): Promise<void> {
    throw new Error("Not implemented");
  }
  public async compute(input: UnprovenBlock): Promise<void> {
    throw new Error("Not implemented");
  }

  public inputSerializer(): TaskSerializer<UnprovenBlock> {
    return {
      toJSON: (input: UnprovenBlock): string => {
        return JSON.stringify(this.blockMapper.mapOut(input));
      },
      fromJSON: (input: string): UnprovenBlock => {
        return this.blockMapper.mapIn(JSON.parse(input));
      },
    };
  }

  public resultSerializer(): TaskSerializer<void> {
    throw new Error("Not implemented");
  }
}
