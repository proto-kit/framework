import { StateServiceCreator } from "../../../state/masking/StateServiceCreator";
import { MaskGraph } from "../../../state/masking/MaskGraph";
import { AsyncStateService } from "../../../state/async/AsyncStateService";

import { InMemoryStateServiceMask } from "./InMemoryStateServiceMask";

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
