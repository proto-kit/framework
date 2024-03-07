import { singleton } from "tsyringe";
import { ObjectMapper } from "../../../ObjectMapper";
import { UntypedStateTransition } from "@proto-kit/sequencer";
import { Prisma } from "@prisma/client";

@singleton()
export class StateTransitionMapper
  implements ObjectMapper<UntypedStateTransition, Prisma.JsonObject>
{
  public mapIn(input: Prisma.JsonObject): UntypedStateTransition {
    return UntypedStateTransition.fromJSON(input as any);
  }

  public mapOut(input: UntypedStateTransition): Prisma.JsonObject {
    return input.toJSON();
  }
}

@singleton()
export class StateTransitionArrayMapper implements ObjectMapper<UntypedStateTransition[], Prisma.JsonValue | undefined> {
  public constructor(private readonly stMapper: StateTransitionMapper) {
  }

  public mapIn(input: Prisma.JsonValue | undefined): UntypedStateTransition[] {
    if (input === undefined) return [];

    if(Array.isArray(input)){
      return (input as Prisma.JsonArray)
        .map(stJson => this.stMapper.mapIn(stJson as Prisma.JsonObject));
    } else {
      return []
    }
  }

  public mapOut(input: UntypedStateTransition[]): Prisma.JsonValue {
    return input.map(st => this.stMapper.mapOut(st)) as Prisma.JsonArray;
  }

}