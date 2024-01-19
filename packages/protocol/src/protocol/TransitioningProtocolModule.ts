import { ProtocolModule } from "./ProtocolModule";

/**
 * A Protocolmodule that enables it's implementing module to access to
 * StateTransitions and state
 */
export abstract class TransitioningProtocolModule<
  Config
> extends ProtocolModule<Config> {
  public name?: string;
}
