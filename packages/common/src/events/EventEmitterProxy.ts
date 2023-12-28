import { EventEmitter } from "./EventEmitter";
import {
  BaseModuleType,
  ModuleContainer,
  ModulesRecord,
} from "../config/ModuleContainer";
import { StringKeyOf } from "../types";
import { EventEmittingComponent, EventsRecord } from "./EventEmittingComponent";

type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (
  x: infer I
) => void
  ? I
  : never;

export type CastToEventsRecord<Record> = Record extends EventsRecord
  ? Record
  : {};

export type ModuleEvents<ModuleType extends BaseModuleType> =
  InstanceType<ModuleType> extends EventEmittingComponent<infer Events>
    ? Events
    : InstanceType<ModuleType> extends ModuleContainer<infer NestedModules>
    ? CastToEventsRecord<ContainerEvents<NestedModules>>
    : EventsRecord;

export type ContainerEvents<Modules extends ModulesRecord> = {
  [Key in StringKeyOf<Modules>]: ModuleEvents<Modules[Key]>;
};

export type FlattenObject<Target extends Record<string, EventsRecord>> =
  UnionToIntersection<Target[keyof Target]>;

export type FlattenedContainerEvents<Modules extends ModulesRecord> =
  FlattenObject<ContainerEvents<Modules>>;

export class EventEmitterProxy<
  Modules extends ModulesRecord,
  // TODO Remove as input
> extends EventEmitter<CastToEventsRecord<
  FlattenedContainerEvents<Modules>
>> {
  public constructor(private readonly container: ModuleContainer<Modules>) {
    super();
    container.moduleNames.forEach((moduleName) => {
      if (
        container.isValidModuleName(container.definition.modules, moduleName)
      ) {
        const module = container.resolve(moduleName);
        if (this.isEventEmitter(module)) {
          module.events.onAll((events: any, args: unknown[]) => {
            this.emit(events, ...(args as any ));
          });
        }
      }
    });
  }

  private isEventEmitter(
    module: any
  ): module is EventEmittingComponent<EventsRecord> {
    const emitter = module.events;
    return emitter !== undefined && emitter instanceof EventEmitter;
  }
}
