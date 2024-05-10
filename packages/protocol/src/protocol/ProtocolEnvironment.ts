import { AreProofsEnabled } from "@proto-kit/common";

import { SimpleAsyncStateService } from "../state/StateService";
import { StateServiceProvider } from "../state/StateServiceProvider";

export interface ProtocolEnvironment {
  get stateService(): SimpleAsyncStateService;
  get stateServiceProvider(): StateServiceProvider;
  getAreProofsEnabled(): AreProofsEnabled;
}
