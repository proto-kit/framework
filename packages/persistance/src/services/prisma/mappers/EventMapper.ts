import { singleton } from "tsyringe";
import { Prisma } from "@prisma/client";
import { Field } from "o1js";

import { ObjectMapper } from "../../../ObjectMapper";

@singleton()
export class EventMapper
  implements
    ObjectMapper<{ eventName: string; data: Field[] }, Prisma.JsonObject>
{
  public mapIn(input: Prisma.JsonObject): { eventName: string; data: Field[] } {
    if (input === undefined) return { eventName: "", data: [] };
    return { eventName: Prisma.JsonNullValueInput(input.eventName), data: input.data };
  }

  public mapOut(input: {
    eventName: string;
    data: Field[];
  }): Prisma.JsonObject {
    return input.toJSON();
  }
}

@singleton()
export class EventArrayMapper
  implements
    ObjectMapper<
      { eventName: string; data: Field[] }[],
      Prisma.JsonValue | undefined
    >
{
  public constructor(private readonly eventMapper: EventMapper) {}

  public mapIn(
    input: Prisma.JsonValue | undefined
  ): { eventName: string; data: Field[] }[] {
    if (input === undefined) return [];

    if (Array.isArray(input)) {
      return (input as Prisma.JsonArray).map((stJson) =>
        this.eventMapper.mapIn(stJson as Prisma.JsonObject)
      );
    }
    return [];
  }

  public mapOut(
    input: { eventName: string; data: Field[] }[]
  ): Prisma.JsonValue {
    return input.map((event) =>
      this.eventMapper.mapOut(event)
    ) as Prisma.JsonArray;
  }
}
