import { AreProofsEnabled, WithZkProgrammable } from "@proto-kit/common";
import {
  MethodPublicOutput,
  StateService,
  StateServiceProvider,
} from "@proto-kit/protocol";

import { MethodIdResolver } from "./MethodIdResolver";

export interface RuntimeEnvironment
  extends WithZkProgrammable<undefined, MethodPublicOutput> {
  get appChain(): AreProofsEnabled | undefined;
  get stateService(): StateService;
  get stateServiceProvider(): StateServiceProvider;
  get methodIdResolver(): MethodIdResolver;
}
