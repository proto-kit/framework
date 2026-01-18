import { singleton } from "tsyringe";
import {
  StateTransitionBatchJson,
  UntypedStateTransition,
} from "@proto-kit/sequencer";
import { Prisma } from "@prisma/client";

import { ObjectMapper } from "../../../ObjectMapper";

@singleton()
export class StateTransitionMapper
  implements ObjectMapper<UntypedStateTransition, Prisma.JsonObject>
{
  public mapIn(input: Prisma.JsonObject): UntypedStateTransition {

    return input as unknown as UntypedStateTransition;
  }

  public mapOut(input: UntypedStateTransition): Prisma.JsonObject {
    // Already JSON-compatible, just cast
    input.toJSON();
    return input as unknown as Prisma.JsonObject;
  }
}

@singleton()
export class StateTransitionArrayMapper
  implements
    ObjectMapper<UntypedStateTransition[], Prisma.JsonValue | undefined>
{
  public constructor(private readonly stMapper: StateTransitionMapper) {}

  public mapIn(
    input: Prisma.JsonValue | undefined
  ): UntypedStateTransition[] {
    if (input === undefined) return [];

    if (Array.isArray(input)) {
      return (input as Prisma.JsonArray).map((stJson) =>
        this.stMapper.mapIn(stJson as Prisma.JsonObject)
      );
    }
    return [];
  }

  public mapOut(input: UntypedStateTransition[]): Prisma.JsonValue {
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
