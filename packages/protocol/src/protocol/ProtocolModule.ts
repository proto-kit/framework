import { AreProofsEnabled, Configurable, ZkProgrammable } from "@yab/common";

import type { Protocol, ProtocolModulesRecord } from "./Protocol";
import { noop } from "lodash";

export abstract class ProtocolModule<PublicInput, PublicOutput>
  extends ZkProgrammable<PublicInput, PublicOutput>
  implements Configurable<unknown>
{
  public config = {};

  public protocol?: Protocol<ProtocolModulesRecord>;

  public get appChain(): AreProofsEnabled | undefined {
    return this.protocol?.dependencyContainer.resolve<AreProofsEnabled>("AppChain");
  }

  public constructor() {
    super();
  }
}
