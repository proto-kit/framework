import { singleton } from "tsyringe";
import { Prisma } from "@prisma/client";

import { ObjectMapper } from "../../../ObjectMapper";

type EventDataJson = {
  eventName: string;
  data: string[];
  source: "afterTxHook" | "beforeTxHook" | "runtime";
};

@singleton()
export class EventMapper implements ObjectMapper<EventDataJson, Prisma.JsonObject> {
  public mapIn(input: Prisma.JsonObject): EventDataJson {
    return {
      eventName: input.eventName as string,
      data: input.data as string[],
      source: this.sourceConvert(input.source as string),
    };
  }

  public mapOut(input: EventDataJson): Prisma.JsonObject {
    return {
      eventName: input.eventName,
      data: input.data,
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
export class EventArrayMapper
  implements ObjectMapper<EventDataJson[], Prisma.JsonValue | undefined>
{
  public constructor(private readonly eventMapper: EventMapper) {}

  public mapIn(input: Prisma.JsonValue | undefined): EventDataJson[] {
    if (input === undefined) return [];

    if (Array.isArray(input)) {
      return (input as Prisma.JsonArray).map((stJson) =>
        this.eventMapper.mapIn(stJson as Prisma.JsonObject)
      );
    }
    return [];
  }

  public mapOut(input: EventDataJson[]): Prisma.JsonValue {
    return input.map((event) =>
      this.eventMapper.mapOut(event)
    ) as Prisma.JsonArray;
  }
}

