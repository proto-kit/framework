import { TypedClass } from "@yab/common";
import { DependencyContainer, injectable, Lifecycle } from "tsyringe";

const errors = {
  descriptorUndefined: () =>
    new Error("Descriptor of that dependency is undefined!"),

  dependencyFactoryCalledDirectly: () =>
    new Error(
      "You cannot access the depdendency method directly, use container.resolve"
    ),
};

const globalFactoryDependencies = new Map<
  string,
  | {
      [key: string]: () => unknown;
    }
  | undefined
>();

/**
 * This is an abstract class for creating DependencyFactories, a pattern
 * to bundle multiple smaller services into one and register them into the
 * injection context.
 *
 * This can for example be a StorageDependencyFactory that creates dependencies
 * like StateService, MerkleWitnessService, etc. So in general, services that
 * are not ConfigurableModules, but still are their own logical unit.
 *
 * DependencyFactories are designed to only be used statically for sets of
 * deps that are necessary for the sequencer to work.
 *
 * Every Factory need the @dependencyFactory annotation (which basically
 * proxies @injectable()) and every method that returns a dependency has to be
 * of the format `() => Dependency` and be annotated with @dependency.
 */
export abstract class DependencyFactory {
  public initDependencies(container: DependencyContainer) {
    const dependencies =
      globalFactoryDependencies.get(this.constructor.name) ?? {};
    globalFactoryDependencies.delete(this.constructor.name);

    for (const [key, useFactory] of Object.entries(dependencies)) {
      container.register(`${key}_singleton-prototype`, {
        useFactory,
      });

      const upperCaseKey = key.charAt(0).toUpperCase() + key.slice(1);

      container.register(
        upperCaseKey,
        {
          useToken: `${key}_singleton-prototype`,
        },
        { lifecycle: Lifecycle.ContainerScoped }
      );
    }
  }
}

export function dependency() {
  return function decorator<Target extends DependencyFactory, Dependency>(
    target: Target,
    key: string,
    descriptor: TypedPropertyDescriptor<() => Dependency>
  ) {
    if (descriptor.value !== undefined) {
      const className = target.constructor.name;
      if (!globalFactoryDependencies.has(className)) {
        globalFactoryDependencies.set(className, {});
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      globalFactoryDependencies.get(target.constructor.name)![key] =
        descriptor.value;

      descriptor.value = () => {
        throw errors.dependencyFactoryCalledDirectly();
      };
    } else {
      throw errors.descriptorUndefined();
    }
    return descriptor;
  };
}

export function dependencyFactory() {
  return function decorator<Target extends DependencyFactory>(
    target: TypedClass<Target>
  ) {
    injectable()(target);
  };
}
