import { singleton } from "tsyringe";
import { Prisma } from "@prisma/client";
import { Field } from "o1js";

import { ObjectMapper } from "../../../ObjectMapper";

@singleton()
export class EventMapper
  implements
    ObjectMapper<
      {
        eventName: string;
        data: Field[];
        source: "afterTxHook" | "beforeTxHook" | "runtime";
      },
      Prisma.JsonObject
    >
{
  public mapIn(input: Prisma.JsonObject): {
    eventName: string;
    data: Field[];
    source: "afterTxHook" | "beforeTxHook" | "runtime";
  } {
    if (input === undefined)
      return { eventName: "", data: [], source: "runtime" };
    return {
      eventName: input.eventName as string,
      data: (input.data as Prisma.JsonArray).map((field) =>
        Field.fromJSON(field as string)
      ),
      source: this.sourceConvert(input.source as string),
    };
  }

  public mapOut(input: {
    eventName: string;
    data: Field[];
    source: "afterTxHook" | "beforeTxHook" | "runtime";
  }): Prisma.JsonObject {
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
export class EventArrayMapper
  implements
    ObjectMapper<
      {
        eventName: string;
        data: Field[];
        source: "afterTxHook" | "beforeTxHook" | "runtime";
      }[],
      Prisma.JsonValue | undefined
    >
{
  public constructor(private readonly eventMapper: EventMapper) {}

  public mapIn(input: Prisma.JsonValue | undefined): {
    eventName: string;
    data: Field[];
    source: "afterTxHook" | "beforeTxHook" | "runtime";
  }[] {
    if (input === undefined) return [];

    if (Array.isArray(input)) {
      return (input as Prisma.JsonArray).map((stJson) =>
        this.eventMapper.mapIn(stJson as Prisma.JsonObject)
      );
    }
    return [];
  }

  public mapOut(
    input: {
      eventName: string;
      data: Field[];
      source: "afterTxHook" | "beforeTxHook" | "runtime";
    }[]
  ): Prisma.JsonValue {
    return input.map((event) =>
      this.eventMapper.mapOut(event)
    ) as Prisma.JsonArray;
  }
}
