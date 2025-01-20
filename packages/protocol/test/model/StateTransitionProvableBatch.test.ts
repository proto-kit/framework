import { Bool, Field } from "o1js";

import {
  ProvableOption,
  ProvableStateTransition,
  ProvableStateTransitionType,
  StateTransitionProvableBatch,
} from "../../src";

describe("StateTransitionProvableBatch", () => {
  function createST(path: Field, from: Field, to: Field) {
    return new ProvableStateTransition({
      path,
      from: new ProvableOption({
        isSome: Bool(true),
        value: from,
      }),
      to: new ProvableOption({
        isSome: Bool(true),
        value: to,
      }),
    });
  }

  it("should transform correctly", () => {
    const st = createST(Field(1), Field(2), Field(3));
    const data = [
      {
        stateTransitions: [st, st, st, st, st],
        applied: Bool(true),
        witnessRoot: Bool(true),
      },
      {
        stateTransitions: [st, st],
        applied: Bool(false),
        witnessRoot: Bool(false),
      },
    ];

    const batches = StateTransitionProvableBatch.fromBatches(data);
    expect(batches).toHaveLength(2);
    expect(batches[0].batch).toStrictEqual([st, st, st, st]);
    const { nothing, closeAndThrowAway, closeAndApply } =
      ProvableStateTransitionType;

    const types = batches[0].batch.map(({ type }) => type);
    const stateTransitions = batches[0].batch.map(
      ({ stateTransition }) => stateTransition
    );
    const witnessRoots = batches[0].batch.map(({ witnessRoot }) => witnessRoot);
    const types2 = batches[1].batch.map(({ type }) => type);

    expect(types).toStrictEqual([nothing, nothing, nothing, nothing]);
    expect(stateTransitions).toStrictEqual([
      st,
      st,
      st,
      ProvableStateTransition.dummy(),
    ]);
    expect(witnessRoots).toStrictEqual([]);

    expect(types2).toStrictEqual([
      closeAndApply,
      nothing,
      closeAndThrowAway,
      nothing,
    ]);
  });
});
