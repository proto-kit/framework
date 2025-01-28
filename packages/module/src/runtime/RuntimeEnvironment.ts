import { AreProofsEnabled, WithZkProgrammable } from "@proto-kit/common";
import {
  MethodPublicOutput,
  SimpleAsyncStateService,
  StateServiceProvider,
} from "@proto-kit/protocol";

import { MethodIdResolver } from "./MethodIdResolver";

export interface RuntimeEnvironment
  extends WithZkProgrammable<undefined, MethodPublicOutput> {
  get areProofsEnabled(): AreProofsEnabled | undefined;
  get stateService(): SimpleAsyncStateService;
  get stateServiceProvider(): StateServiceProvider;
  get methodIdResolver(): MethodIdResolver;
}
