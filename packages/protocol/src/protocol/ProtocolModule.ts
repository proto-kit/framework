import { Configurable, ZkProgrammable } from "@yab/common";

import type { Protocol, ProtocolModulesRecord } from "./Protocol";

export abstract class ProtocolModule<PublicInput, PublicOutput>
  extends ZkProgrammable<PublicInput, PublicOutput>
  implements Configurable<unknown>
{
  public config = {};

  // public protocol?: Protocol<ProtocolModulesRecord>;
}
