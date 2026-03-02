import { singleton } from "tsyringe";
import { Prisma } from "@prisma/client";
import { Field } from "o1js";

import { ObjectMapper } from "../../../ObjectMapper";

type EventData = {
  eventName: string;
  data: Field[];
  source: "afterTxHook" | "beforeTxHook" | "runtime";
};

@singleton()
export class EventMapper implements ObjectMapper<EventData, Prisma.JsonObject> {
  public mapIn(input: Prisma.JsonObject): EventData {
    return {
      eventName: input.eventName as string,
      data: (input.data as Prisma.JsonArray).map((field) =>
        Field.fromJSON(field as string)
      ),
      source: this.sourceConvert(input.source as string),
    };
  }

  public mapOut(input: EventData): Prisma.JsonObject {
    return {
      eventName: input.eventName,
      data: input.data.map((field) => field.toString()),
      source: input.source,
    } as Prisma.JsonObject;
  }

  private sourceConvert(input: string) {
    if (
      input === "beforeTxHook" ||
      input === "afterTxHook" ||
      input === "runtime"
    ) {
      return input;
    }
    throw new Error(
      "Event Source must be one of 'beforeTxHook', 'afterTxHook' or 'runtime'"
    );
  }
}

@singleton()
export class EventArrayMapper implements ObjectMapper<
  EventData[],
  Prisma.JsonValue | undefined
> {
  public constructor(private readonly eventMapper: EventMapper) {}

  public mapIn(input: Prisma.JsonValue | undefined): EventData[] {
    if (input === undefined) return [];

    if (Array.isArray(input)) {
      return (input as Prisma.JsonArray).map((stJson) =>
        this.eventMapper.mapIn(stJson as Prisma.JsonObject)
      );
    }
    return [];
  }

  public mapOut(input: EventData[]): Prisma.JsonValue {
    return input.map((event) =>
      this.eventMapper.mapOut(event)
    ) as Prisma.JsonArray;
  }
}
