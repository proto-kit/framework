import { EventEmitter } from "./EventEmitter";
import { ModuleContainer, ModulesRecord } from "../config/ModuleContainer";
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

export type ContainerEvents<Modules extends ModulesRecord> = {
  [Key in StringKeyOf<Modules>]: InstanceType<
    Modules[Key]
  > extends EventEmittingComponent<infer Events>
    ? Events
    : InstanceType<Modules[Key]> extends ModuleContainer<infer NestedModules>
    ? CastToEventsRecord<ContainerEvents<NestedModules>>
    : EventsRecord;
};

export type FlattenObject<Target extends Record<string, EventsRecord>> =
  UnionToIntersection<Target[keyof Target]>;

export type FlattenedContainerEvents<Modules extends ModulesRecord> =
  FlattenObject<ContainerEvents<Modules>>;

type ReferenceRecord<EventRecord extends EventsRecord> = {
  [Key in keyof EventRecord]: EventEmitter<Record<Key, EventRecord[Key]>>;
};

export class EventEmitterProxy<
  Modules extends ModulesRecord,
  // TODO Remove as input
  EventRecord extends EventsRecord = CastToEventsRecord<
    FlattenedContainerEvents<Modules>
  >
> implements Omit<EventEmitter<EventRecord>, "listeners">
{
  public constructor(private readonly container: ModuleContainer<Modules>) {}

  public emit(
    event: keyof EventRecord,
    ...parameters: EventRecord[typeof event]
  ): void {
    throw new Error("Not to be used in this fashion");
  }

  private forEachEventEmitter(f: (emitter: EventEmitter<EventRecord>) => void) {
    const moduleNames = this.container.moduleNames as StringKeyOf<Modules>[];

    // Current strategy: Register event on all modules since
    // we have no way narrowing that down
    moduleNames.forEach((moduleName) => {
      const module = this.container.resolve(moduleName);
      const emitter = (module as any)["events"];
      if (emitter !== undefined && emitter instanceof EventEmitter) {
        f(emitter);
      }
    });
  }

  public on(
    event: keyof EventRecord,
    listener: (...args: EventRecord[typeof event]) => void
  ): void {
    this.forEachEventEmitter((emitter) => {
      emitter.on(event, listener);
    });
  }

  public off(
    event: keyof EventRecord,
    listener: (...args: EventRecord[typeof event]) => void
  ): void {
    this.forEachEventEmitter((emitter) => {
      emitter.off(event, listener);
    });
  }
}
