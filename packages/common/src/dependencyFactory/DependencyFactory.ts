import {
  ClassProvider,
  FactoryProvider,
  TokenProvider,
  ValueProvider,
} from "tsyringe";

import { TypedClass } from "../types";
import type { BaseModuleInstanceType } from "../config/ModuleContainer";

export type DependencyDeclaration<Dependency> =
  | ClassProvider<Dependency>
  | FactoryProvider<Dependency>
  | TokenProvider<Dependency>
  | ValueProvider<Dependency>;

export type DependencyRecord = Record<
  string,
  DependencyDeclaration<unknown> & { forceOverwrite?: boolean }
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
export interface DependencyFactory {
  dependencies: () => DependencyRecord;
}

export type TypeFromDependencyDeclaration<
  Declaration extends DependencyDeclaration<unknown>,
> =
  Declaration extends DependencyDeclaration<infer Dependency>
    ? Dependency
    : never;

export type CapitalizeAny<Key extends string | number | symbol> =
  Key extends string ? Capitalize<Key> : Key;

export type MapDependencyRecordToTypes<Record extends DependencyRecord> = {
  [Key in keyof Record as CapitalizeAny<Key>]: TypedClass<
    TypeFromDependencyDeclaration<Record[Key]>
  >;
};

export type InferDependencies<Class extends BaseModuleInstanceType> =
  Class extends DependencyFactory
    ? MapDependencyRecordToTypes<ReturnType<Class["dependencies"]>>
    : never;
