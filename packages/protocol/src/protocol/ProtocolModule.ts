import {
  AreProofsEnabled,
  ChildContainerProvider,
  ConfigurableModule, NoConfig,
  noop
} from "@proto-kit/common";

import { ProtocolEnvironment } from "./ProtocolEnvironment";

export abstract class ProtocolModule<
  Config = NoConfig
> extends ConfigurableModule<Config> {
  public protocol?: ProtocolEnvironment;

  public get appChain(): AreProofsEnabled | undefined {
    return this.protocol?.getAreProofsEnabled();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public create(childContainerProvider: ChildContainerProvider): void {
    noop();
  }
}
