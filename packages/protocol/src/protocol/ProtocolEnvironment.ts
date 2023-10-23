import { StateService } from "../state/StateService";
import { StateServiceProvider } from "../state/StateServiceProvider";
import { AreProofsEnabled } from "@proto-kit/common";

export interface ProtocolEnvironment {
  get stateService(): StateService
  get stateServiceProvider(): StateServiceProvider
  getAreProofsEnabled(): AreProofsEnabled
}