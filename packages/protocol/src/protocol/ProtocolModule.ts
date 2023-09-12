import {
  AreProofsEnabled,
  Configurable,
} from "@proto-kit/common";

import type { Protocol, ProtocolModulesRecord } from "./Protocol";

export abstract class ProtocolModule
  implements Configurable<unknown>
{
  public config = {};

  public protocol?: Protocol<ProtocolModulesRecord>;

  public get appChain(): AreProofsEnabled | undefined {
    return this.protocol?.dependencyContainer.resolve<AreProofsEnabled>(
      "AppChain"
    );
  }
}
