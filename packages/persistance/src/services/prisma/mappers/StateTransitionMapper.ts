import { singleton } from "tsyringe";
import {
  StateTransitionBatch,
  UntypedOption,
  UntypedStateTransition,
} from "@proto-kit/sequencer";
import {
  StateTransitionBatch as DBStateTransitionBatch,
  StateTransition as DBStateTransition,
} from "@prisma/client";
import { Bool, Field } from "o1js";

import { ObjectMapper } from "../../../ObjectMapper";

@singleton()
export class StateTransitionMapper
  implements
    ObjectMapper<
      UntypedStateTransition,
      Omit<DBStateTransition, "batchId" | "id">
    >
{
  public mapOut(
    input: UntypedStateTransition
  ): Omit<DBStateTransition, "batchId" | "id"> {
    return {
      path: input.path.toString(),
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      from: input.from.isSome
        ? input.from.value.map((x: Field) => x.toString())
        : [],
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      to: input.to.isSome ? input.to.value.map((x: Field) => x.toString()) : [],
    };
  }

  public mapIn(
    input: Omit<DBStateTransition, "batchId" | "id">
  ): UntypedStateTransition {
    return UntypedStateTransition.fromJSON({
      path: input.path,
      from: {
        isSome: input.from.length !== 0,
        value: input.from,
        isForcedSome: false,
      },
      to: {
        isSome: input.to.length !== 0,
        value: input.to,
        isForcedSome: false,
      },
    });
  }
}

@singleton()
export class StateTransitionBatchArrayMapper
  implements
    ObjectMapper<
      StateTransitionBatch[],
      Omit<
        DBStateTransitionBatch,
        "txExecutionResultId" | "id" | "blockId" | "blockResultId"
      >[]
    >
{
  public constructor(
    private readonly stateTransitionMapper: StateTransitionMapper
  ) {}

  public mapOut(
    input: StateTransitionBatch[]
  ): Omit<
    DBStateTransitionBatch,
    "txExecutionResultId" | "id" | "blockId" | "blockResultId"
  >[] {
    return input.map((stBatch) => ({
      applied: stBatch.applied,
    }));
  }

  public mapIn(
    input: Omit<
      DBStateTransitionBatch,
      "txExecutionResultId" | "id" | "blockId" | "blockResultId"
    >[]
  ): StateTransitionBatch[] {
    return input.map(stBatch=>
      ({
      applied: stBatch.applied,
        stateTransitions: fhfhf,
    });
  }
}
