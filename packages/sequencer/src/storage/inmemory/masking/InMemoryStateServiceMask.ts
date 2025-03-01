import { AsyncStateService } from "../../../state/async/AsyncStateService";
import { CachedStateService } from "../../../state/state/CachedStateService";

export class InMemoryStateServiceMask extends CachedStateService {
  public constructor(
    parent: AsyncStateService | undefined,
    public readonly maskName: string
  ) {
    super(parent);
  }

  public async createMask(maskName: string): Promise<InMemoryStateServiceMask> {
    return new InMemoryStateServiceMask(this, maskName);
  }
}
