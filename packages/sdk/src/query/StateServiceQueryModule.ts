import {
  AsyncStateService,
  QueryTransportModule,
  Sequencer,
  SequencerModulesRecord,
} from "@proto-kit/sequencer";
import { Field } from "o1js";
import { inject, injectable } from "tsyringe";
import { NoConfig } from "@proto-kit/common";

import { AppChainModule } from "../appChain/AppChainModule";

@injectable()
export class StateServiceQueryModule
  extends AppChainModule<NoConfig>
  implements QueryTransportModule
{
  public constructor(
    @inject("Sequencer") public sequencer: Sequencer<SequencerModulesRecord>
  ) {
    super();
  }

  public get asyncStateService(): AsyncStateService {
    return this.sequencer.dependencyContainer.resolve("AsyncStateService");
  }

  public async get(key: Field) {
    return await this.asyncStateService.getAsync(key);
  }
}
