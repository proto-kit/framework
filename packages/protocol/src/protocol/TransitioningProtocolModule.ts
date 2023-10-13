import { ProtocolModule } from "./ProtocolModule";

export abstract class TransitioningProtocolModule<
  Config
> extends ProtocolModule<Config> {
  public name?: string;
}
