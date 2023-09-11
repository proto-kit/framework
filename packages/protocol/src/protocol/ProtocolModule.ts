import { Configurable, ZkProgrammable } from "@yab/common";

export abstract class ProtocolModule<PublicInput, PublicOutput>
  extends ZkProgrammable<PublicInput, PublicOutput>
  implements Configurable<unknown>
{
  public config = {};
}