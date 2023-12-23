import { DependencyContainer, injectable, Lifecycle } from "tsyringe";

import { TypedClass } from "../types";
import { log } from "../log";
import { SequencerModule } from "@proto-kit/sequencer";
import { InMemoryStateService } from "@proto-kit/module";
import { ConfigurableModule } from "../config/ConfigurableModule";
import { BaseModuleInstanceType, BaseModuleType } from "../config/ModuleContainer";

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

    for (const [key, useFactory] of Object.entries(dependencies)) {
      container.register(`${key}_singleton-prototype`, {
        useFactory: useFactory.bind(this),
      });

      const upperCaseKey = key.charAt(0).toUpperCase() + key.slice(1);

      container.register(
        upperCaseKey,
        {
          useToken: `${key}_singleton-prototype`,
        },
        { lifecycle: Lifecycle.ContainerScoped }
      );

      log.debug(
        `Registered dependency ${upperCaseKey} from factory ${this.constructor.name}`
      );
    }
  }
}

export type DependencyDeclaration =
  | { type: TypedClass<unknown> }
  | { instance: unknown };
export type DependencyRecord = Record<string, DependencyDeclaration>;

export interface DependencyFactory2 {
  dependencies(): DependencyRecord;
}

class Factory extends SequencerModule implements DependencyFactory2 {
  start(): Promise<void> {
    return Promise.resolve(undefined);
  }

  dependencies() {
    return {
      stateService: {
        type: InMemoryStateService,
      },
    };
  }
}

export type TypeFromDependencyDeclaration<
  Declaration extends DependencyDeclaration
> = Declaration extends { type: TypedClass<unknown> }
  ? Declaration["type"] extends TypedClass<infer Class>
    ? Class
    : never
  : Declaration extends { instance: unknown }
  ? Declaration["instance"]
  : never;

export type MapDependencyRecordToTypes<Record extends DependencyRecord> = {
  [Key in keyof Record]: TypedClass<TypeFromDependencyDeclaration<Record[Key]>>;
};

export type InferDependencies<Class extends BaseModuleInstanceType> =
  Class extends DependencyFactory2
    ? MapDependencyRecordToTypes<ReturnType<Class["dependencies"]>>
    : never;

type Deps = InferDependencies<Factory>;
// type ClassType = TypeFromDependencyDeclaration<Deps["stateService"]>;

// export abstract class DependencyFactory2 {
//   abstract
// }

// type DTypes = { [key: string]: TypedClass<unknown> }
// type Factories<T extends DTypes> = {
//   [key in keyof T]: T[key] extends TypedClass<infer R> ? () => R : never
// }
//
// export abstract class DF2<Types extends DTypes> {
//   public constructor(private factories: Factories<Types>) {
//
//   }
//   generateDependencies(): Types {
//     let x = this.factories;
//     return {} as Types;
//   }
// }

// export function DF2C<T extends Types>(object: Factories<T>): T {
//   const c = class C extends DF2<T>{
//     generateDependencies(): T {
//       return undefined;
//     }
//   }
//   return new c();
// }

// class DF2I extends DF2<{x: typeof ConfigurableModule}> {
//   constructor() {
//     super({
//       x: this.x
//     });
//   }
//
//   x(): ConfigurableModule<any> {
//     return {} as ConfigurableModule<any>;
//   }
//
// }

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
