import {
  ClassProvider,
  DependencyContainer,
  FactoryProvider,
  TokenProvider,
  ValueProvider,
} from "tsyringe";

import { TypedClass } from "../types";
import { noop } from "../utils";

export type GeneratedProvider<Dependency, Module> = {
  useGenerated: (module: Module, container: DependencyContainer) => Dependency;
};

export type DependencyDeclaration<Dependency, This = unknown> =
  | ClassProvider<Dependency>
  | FactoryProvider<Dependency>
  | TokenProvider<Dependency>
  | ValueProvider<Dependency>
  | GeneratedProvider<Dependency, This>;

export function isGeneratedProvider<Dependency, Module>(
  input: DependencyDeclaration<Dependency, Module>
): input is GeneratedProvider<Dependency, Module> {
  return "useGenerated" in input;
}

export type DependencyRecord<This = unknown> = Record<
  string,
  DependencyDeclaration<unknown, This> & { forceOverwrite?: boolean }
>;

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
 */
export interface DependencyFactory<Type> {
  dependencies: () => DependencyRecord<Type>;
}

export function dependencyFactory<T extends TypedClass<unknown>>() {
  return (
    /**
     * Check if the target class extends RuntimeModule, while
     * also providing static config presets
     */
    target: T & DependencyFactory<InstanceType<T>>
  ) => {
    noop();
  };
}

export type TypeFromDependencyDeclaration<
  Declaration extends DependencyDeclaration<any>,
> =
  Declaration extends DependencyDeclaration<infer Dependency, any>
    ? Dependency
    : never;

export type CapitalizeAny<Key extends string | number | symbol> =
  Key extends string ? Capitalize<Key> : Key;

export type MapDependencyRecordToTypes<Record extends DependencyRecord<any>> = {
  [Key in keyof Record as CapitalizeAny<Key>]: TypedClass<
    TypeFromDependencyDeclaration<Record[Key]>
  >;
};

export type InferDependencies<Class extends TypedClass<any>> =
  Class extends DependencyFactory<any>
    ? MapDependencyRecordToTypes<ReturnType<Class["dependencies"]>>
    : never;
