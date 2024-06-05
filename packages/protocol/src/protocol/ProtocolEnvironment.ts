import { AreProofsEnabled } from "@proto-kit/common";

import { StateService } from "../state/StateService";
import { StateServiceProvider } from "../state/StateServiceProvider";

export interface ProtocolEnvironment {
  get stateService(): StateService;
  get stateServiceProvider(): StateServiceProvider;
  getAreProofsEnabled(): AreProofsEnabled;
}
