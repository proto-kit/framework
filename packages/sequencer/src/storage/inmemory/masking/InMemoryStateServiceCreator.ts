import { StateServiceCreator } from "../../../state/masking/StateServiceCreator";
import { MaskGraph } from "../../../state/masking/MaskGraph";

import { InMemoryStateServiceMask } from "./InMemoryStateServiceMask";

export class InMemoryStateServiceCreator
  extends MaskGraph<InMemoryStateServiceMask, InMemoryStateServiceMask>
  implements StateServiceCreator
{
  public constructor() {
    super(new InMemoryStateServiceMask(undefined, "base"));
  }
}
