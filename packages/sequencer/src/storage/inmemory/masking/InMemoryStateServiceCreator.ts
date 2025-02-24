import { StateServiceCreator } from "../../../state/masking/StateServiceCreator";
import { MaskGraph } from "../../../state/masking/MaskGraph";

import { InMemoryStateServiceMask } from "./InMemoryStateServiceMask";
import { AsyncStateService } from "../../../state/async/AsyncStateService";

export class InMemoryStateServiceCreator
  extends MaskGraph<
    AsyncStateService,
    InMemoryStateServiceMask,
    InMemoryStateServiceMask
  >
  implements StateServiceCreator
{
  public constructor() {
    super(new InMemoryStateServiceMask(undefined, "base"));
  }
}
