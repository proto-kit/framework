import { injectable, singleton } from "tsyringe";
import { Field } from "o1js";

@injectable()
@singleton()
export class SequencerIdProvider {
  private readonly sequencerId: string;

  public constructor() {
    this.sequencerId = Field.random().toString();
  }

  public getSequencerId(): string {
    return this.sequencerId;
  }
}
