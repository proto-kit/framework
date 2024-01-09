import {
  AsyncStateService,
  QueryTransportModule,
  Sequencer,
  SequencerModulesRecord,
} from "@proto-kit/sequencer";
import { Field } from "o1js";
import { inject, injectable } from "tsyringe";

import { AppChainModule } from "../appChain/AppChainModule";

@injectable()
export class StateServiceQueryModule
  extends AppChainModule
  implements QueryTransportModule
{
  public constructor(
    @inject("Sequencer") public sequencer: Sequencer<SequencerModulesRecord>
  ) {
    super();
  }

  public get asyncStateService(): AsyncStateService {
    return this.sequencer.dependencyContainer.resolve<AsyncStateService>(
      "UnprovenStateService"
    );
  }

  public async get(key: Field) {
    return await this.asyncStateService.getAsync(key);
  }
}
