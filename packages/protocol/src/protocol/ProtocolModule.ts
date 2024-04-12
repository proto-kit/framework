import {
  AreProofsEnabled,
  ChildContainerProvider,
  ConfigurableModule,
  NoConfig,
  noop,
} from "@proto-kit/common";

import { ProtocolEnvironment } from "./ProtocolEnvironment";

export abstract class ProtocolModule<
  Config = NoConfig,
> extends ConfigurableModule<Config> {
  public protocol?: ProtocolEnvironment;

  public get appChain(): AreProofsEnabled | undefined {
    return this.protocol?.getAreProofsEnabled();
  }

  public create(childContainerProvider: ChildContainerProvider): void {
    noop();
  }
}
