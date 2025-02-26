import { singleton } from "tsyringe";
import {
  StateTransitionBatch,
  UntypedStateTransition,
} from "@proto-kit/sequencer";
import {
  StateTransitionBatch as DBStateTransitionBatch,
  StateTransition as DBStateTransition,
} from "@prisma/client";
import { Field } from "o1js";

import { ObjectMapper } from "../../../ObjectMapper";

export type STBatchArrayMapOut1 = Omit<
  DBStateTransitionBatch,
  "txExecutionResultId" | "id" | "blockId" | "blockResultId"
>;
export type STBatchArrayMapOut2 = Omit<DBStateTransition, "batchId" | "id">[];

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
      from: input.from.isSome.toBoolean()
        ? input.from.value.map((x: Field) => x.toString())
        : [],
      to: input.to.isSome.toBoolean()
        ? input.to.value.map((x: Field) => x.toString())
        : [],
    };
  }

  public mapIn(
    input: Omit<DBStateTransition, "batchId" | "id">
  ): UntypedStateTransition {
    const ut = UntypedStateTransition.fromJSON({
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
    ut.fromValue.forceSome();
    return ut;
  }
}

@singleton()
export class StateTransitionBatchArrayMapper
  implements
    ObjectMapper<
      StateTransitionBatch[],
      [
        Omit<
          DBStateTransitionBatch,
          "txExecutionResultId" | "id" | "blockId" | "blockResultId"
        >,
        Omit<DBStateTransition, "batchId" | "id">[],
      ][]
    >
{
  public constructor(
    private readonly stateTransitionMapper: StateTransitionMapper
  ) {}

  public mapOut(
    input: StateTransitionBatch[]
  ): [STBatchArrayMapOut1, STBatchArrayMapOut2][] {
    return input.map((stBatch) => [
      {
        applied: stBatch.applied,
      },
      stBatch.stateTransitions.map((st) =>
        this.stateTransitionMapper.mapOut(st)
      ),
    ]);
  }

  public mapIn(
    input: [STBatchArrayMapOut1, STBatchArrayMapOut2][]
  ): StateTransitionBatch[] {
    return input.map((x) => ({
      applied: x[0].applied,
      stateTransitions: x[1].map((st) => this.stateTransitionMapper.mapIn(st)),
    }));
  }
}
