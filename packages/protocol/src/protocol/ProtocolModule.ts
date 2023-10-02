import { AreProofsEnabled, Configurable } from "@proto-kit/common";

import { ProtocolEnvironment } from "./ProtocolEnvironment";

export abstract class ProtocolModule implements Configurable<unknown> {
  public config = {};

  public protocol?: ProtocolEnvironment;

  public get appChain(): AreProofsEnabled | undefined {
    return this.protocol?.getAreProofsEnabled();
  }
}
