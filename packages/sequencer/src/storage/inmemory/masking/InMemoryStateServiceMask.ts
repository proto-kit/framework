import { AsyncStateService } from "../../../state/async/AsyncStateService";
import { CachedStateService } from "../../../state/state/CachedStateService";

export class InMemoryStateServiceMask extends CachedStateService {
  public constructor(
    parent: AsyncStateService | undefined,
    public readonly name: string
  ) {
    super(parent);
  }

  public async createMask(name: string): Promise<InMemoryStateServiceMask> {
    return new InMemoryStateServiceMask(this, name);
  }
}
