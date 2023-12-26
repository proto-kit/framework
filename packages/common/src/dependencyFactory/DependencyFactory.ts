import {
  ClassProvider,
  DependencyContainer,
  FactoryProvider,
  injectable,
  Lifecycle,
  ValueProvider,
} from "tsyringe";

import { TypedClass } from "../types";
import { log } from "../log";
import { BaseModuleInstanceType } from "../config/ModuleContainer";

export type DependencyDeclaration =
  | ClassProvider<unknown>
  | FactoryProvider<unknown>
  | ValueProvider<unknown>;

export type DependencyRecord = Record<string, DependencyDeclaration>;

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
  dependencies(): DependencyRecord;
}

// TODO Maybe use infer instead of indexed type access
export type TypeFromDependencyDeclaration<
  Declaration extends DependencyDeclaration
> = Declaration extends ClassProvider<unknown>
  ? Declaration["useClass"] extends TypedClass<infer Class>
    ? Class
    : never
  : Declaration extends ValueProvider<unknown>
  ? Declaration["useValue"]
  : Declaration extends FactoryProvider<unknown>
  ? ReturnType<Declaration["useFactory"]>
  : never;

export type MapDependencyRecordToTypes<Record extends DependencyRecord> = {
  [Key in keyof Record]: TypedClass<TypeFromDependencyDeclaration<Record[Key]>>;
};

export type InferDependencies<Class extends BaseModuleInstanceType> =
  Class extends DependencyFactory
    ? MapDependencyRecordToTypes<ReturnType<Class["dependencies"]>>
    : never;