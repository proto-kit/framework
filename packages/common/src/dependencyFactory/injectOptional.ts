import {
  container,
  injectable,
  injectWithTransform,
  Lifecycle,
  scoped,
} from "tsyringe";

@injectable()
@scoped(Lifecycle.ResolutionScoped)
class UndefinedDisguise {}

class UndefinedTransform<Dependency> {
  public transform(
    incoming: Dependency | UndefinedDisguise
  ): Dependency | undefined {
    if (incoming instanceof UndefinedDisguise) {
      return undefined;
    }
    return incoming;
  }
}

/**
 * This function injects a dependency only if it has been registered, otherwise
 * injects undefined. This can be useful for having optional dependencies, where
 * tsyringe would normally error out and not be able to resolve. With this
 * decorator, we can now do this.
 *
 * The strategy we employ here is that we inject a dummy into the global
 * container that is of type UndefinedDisguise. We can't inject undefined
 * directly, therefore we use this object to disguise itself as undefined.
 * Then a child container registers something under the same token, it by
 * default resolves that new dependency. If that doesn't happen, the
 * resolution hits our disguise, which we then convert into undefined
 * using the Transform
 */
export function injectOptional<T>(token: string) {
  container.register(token, { useClass: UndefinedDisguise });
  return injectWithTransform(token, UndefinedTransform<T>);
}
