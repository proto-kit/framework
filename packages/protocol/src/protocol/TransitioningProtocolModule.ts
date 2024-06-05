import { ProtocolModule } from "./ProtocolModule";

/**
 * TransitioningProtocolModule is a base interface that allows inheriting
 * classes to use State and StateMap since it requires the implementation
 * of a `name: string` property, which those classes need to function.
 */
export abstract class TransitioningProtocolModule<
  Config,
> extends ProtocolModule<Config> {
  public name?: string;
}
