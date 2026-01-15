import { singleton } from "tsyringe";
import {
  StateTransitionBatchJson,
  UntypedStateTransitionJson,
} from "@proto-kit/sequencer";
import { Prisma } from "@prisma/client";

import { ObjectMapper } from "../../../ObjectMapper";

@singleton()
export class StateTransitionMapper
  implements ObjectMapper<UntypedStateTransitionJson, Prisma.JsonObject>
{
  public mapIn(input: Prisma.JsonObject): UntypedStateTransitionJson {
    // 
    return input as unknown as UntypedStateTransitionJson;
  }

  public mapOut(input: UntypedStateTransitionJson): Prisma.JsonObject {
    // Already JSON-compatible, just cast
    return input as unknown as Prisma.JsonObject;
  }
}

@singleton()
export class StateTransitionArrayMapper
  implements
    ObjectMapper<UntypedStateTransitionJson[], Prisma.JsonValue | undefined>
{
  public constructor(private readonly stMapper: StateTransitionMapper) {}

  public mapIn(input: Prisma.JsonValue | undefined): UntypedStateTransitionJson[] {
    if (input === undefined) return [];

    if (Array.isArray(input)) {
      return (input as Prisma.JsonArray).map((stJson) =>
        this.stMapper.mapIn(stJson as Prisma.JsonObject)
      );
    }
    return [];
  }

  public mapOut(input: UntypedStateTransitionJson[]): Prisma.JsonValue {
    return input.map((st) => this.stMapper.mapOut(st)) as Prisma.JsonArray;
  }
}

@singleton()
export class StateTransitionBatchArrayMapper
  implements ObjectMapper<StateTransitionBatchJson[], Prisma.JsonValue>
{
  public constructor(
    private readonly stArrayMapper: StateTransitionArrayMapper
  ) {}

  public mapOut(input: StateTransitionBatchJson[]): Prisma.JsonValue {
    return input.map((st) => ({
      stateTransitions: this.stArrayMapper.mapOut(
        st.stateTransitions
      ) as Prisma.JsonArray,
      applied: st.applied,
    }));
  }

  public mapIn(input: Prisma.JsonValue): StateTransitionBatchJson[] {
    if (input === undefined) return [];

    if (Array.isArray(input)) {
      return (input as Prisma.JsonArray).map((stJson) => {
        const batchJsonObject = stJson as Prisma.JsonObject;
        return {
          stateTransitions: this.stArrayMapper.mapIn(
            batchJsonObject.stateTransitions
          ),
          applied: batchJsonObject.applied as boolean,
        };
      });
    }
    return [];
  }
}
