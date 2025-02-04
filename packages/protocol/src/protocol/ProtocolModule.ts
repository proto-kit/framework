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

  public get areProofsEnabled(): AreProofsEnabled | undefined {
    return this.protocol?.getAreProofsEnabled();
  }

  public create(childContainerProvider: ChildContainerProvider): void {
    noop();
  }

  public async start() {
    noop();
  }
}
