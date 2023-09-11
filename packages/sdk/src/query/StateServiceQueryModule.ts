/* eslint-disable import/no-unused-modules */
import {
  AsyncStateService,
  Sequencer,
  SequencerModulesRecord,
} from "@proto-kit/sequencer";
import { Field } from "snarkyjs";
import { inject, injectable } from "tsyringe";

import { AppChainModule } from "../appChain/AppChainModule";

export interface QueryTransportModule {
  get: (key: Field) => Promise<Field[] | undefined>;
}

@injectable()
export class StateServiceQueryModule
  extends AppChainModule<unknown>
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
