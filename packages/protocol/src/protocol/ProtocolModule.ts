import {
  AreProofsEnabled,
  Configurable,
  ZkProgrammable,
} from "@proto-kit/common";

import type { Protocol, ProtocolModulesRecord } from "./Protocol";

export abstract class ProtocolModule<PublicInput, PublicOutput>
  extends ZkProgrammable<PublicInput, PublicOutput>
  implements Configurable<unknown>
{
  public config = {};

  public protocol?: Protocol<ProtocolModulesRecord>;

  public constructor() {
    super();
  }

  public get appChain(): AreProofsEnabled | undefined {
    return this.protocol?.dependencyContainer.resolve<AreProofsEnabled>(
      "AppChain"
    );
  }
}
