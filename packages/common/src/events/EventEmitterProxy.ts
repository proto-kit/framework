import type {
  BaseModuleType,
  ModuleContainer,
  ModulesRecord,
} from "../config/ModuleContainer";
import { StringKeyOf, UnionToIntersection } from "../types";

import { EventEmitter } from "./EventEmitter";
import {
  EventEmittingComponent,
  EventEmittingContainer,
  EventsRecord,
} from "./EventEmittingComponent";

export type CastToEventsRecord<Record> = Record extends EventsRecord
  ? Record
  : {};

export type ModuleEvents<ModuleType extends BaseModuleType> =
  InstanceType<ModuleType> extends EventEmittingComponent<infer Events>
    ? Events
    : InstanceType<ModuleType> extends ModuleContainer<infer NestedModules>
      ? CastToEventsRecord<ContainerEvents<NestedModules>>
      : // &
        // (InstanceType<ModuleType> extends EventEmittingContainer<
        //   infer ContainerEvents
        // >
        //   ? ContainerEvents
        //   : {})
        EventsRecord;

export type ContainerEvents<Modules extends ModulesRecord> = {
  [Key in StringKeyOf<Modules>]: ModuleEvents<Modules[Key]>;
};

export type FlattenObject<Target extends Record<string, EventsRecord>> =
  UnionToIntersection<Target[keyof Target]>;

export type FlattenedContainerEvents<Modules extends ModulesRecord> =
  FlattenObject<ContainerEvents<Modules>>; // & FlattenObject<any>;

export class EventEmitterProxy<
  Modules extends ModulesRecord,
> extends EventEmitter<CastToEventsRecord<FlattenedContainerEvents<Modules>>> {
  public constructor(private readonly container: ModuleContainer<Modules>) {
    super();
    container.moduleNames.forEach((moduleName) => {
      if (
        container.isValidModuleName(container.definition.modules, moduleName)
      ) {
        const module = container.resolve(moduleName);
        if (this.isEventEmitter(module)) {
          module.events.onAll((events: any, args: any[]) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            this.emit(events, ...args);
          });
        }
        if (this.isEventEmittingContainer(module)) {
          module.containerEvents.onAll((events: any, args: any[]) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            this.emit(events, ...args);
          });
        }
      }
    });
  }

  private isEventEmittingContainer(
    module: any
  ): module is EventEmittingContainer<EventsRecord> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const emitter = module.containerEvents;
    return emitter !== undefined && emitter instanceof EventEmitter;
  }

  private isEventEmitter(
    module: any
  ): module is EventEmittingComponent<EventsRecord> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const emitter = module.events;
    return emitter !== undefined && emitter instanceof EventEmitter;
  }
}
