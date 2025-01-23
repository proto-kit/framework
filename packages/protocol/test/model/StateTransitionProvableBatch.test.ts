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

  it("should place witnessRoots correctly on empty batch", () => {
    const st = createST(Field(1), Field(2), Field(3));
    const data = [
      {
        stateTransitions: [st, st],
        applied: Bool(true),
        witnessRoot: Bool(false),
      },
      {
        stateTransitions: [],
        applied: Bool(true),
        witnessRoot: Bool(true),
      },
    ];

    const batches = StateTransitionProvableBatch.fromBatches(data);
    expect(batches).toHaveLength(1);

    const { batch } = batches[0];
    expect(batch[0].witnessRoot.toBoolean()).toBe(false);
    expect(batch[1].witnessRoot.toBoolean()).toBe(true);
    // Should be dummy
    expect(batch[2].witnessRoot.toBoolean()).toBe(false);
  });

  it("should place witnessRoots correctly on empty batch", () => {
    const st = createST(Field(1), Field(2), Field(3));
    const data = [
      {
        stateTransitions: [st, st],
        applied: Bool(true),
        witnessRoot: Bool(false),
      },
      {
        stateTransitions: [st],
        applied: Bool(false),
        witnessRoot: Bool(true),
      },
    ];

    const batches = StateTransitionProvableBatch.fromBatches(data);
    expect(batches).toHaveLength(1);

    const { batch } = batches[0];
    expect(batch[0].witnessRoot.toBoolean()).toBe(false);
    expect(batch[1].witnessRoot.toBoolean()).toBe(false);
    expect(batch[2].witnessRoot.toBoolean()).toBe(true);
  });

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
    const { nothing, closeAndThrowAway, closeAndApply } =
      ProvableStateTransitionType;

    const types = batches[0].batch.map(({ type }) => type);
    const stateTransitions = batches[0].batch.map(
      ({ stateTransition }) => stateTransition
    );
    const witnessRoots = batches[0].batch.map(({ witnessRoot }) => witnessRoot);

    const types2 = batches[1].batch.map(({ type }) => type);
    const stateTransitions2 = batches[1].batch.map(
      ({ stateTransition }) => stateTransition
    );
    const witnessRoots2 = batches[1].batch.map(
      ({ witnessRoot }) => witnessRoot
    );

    expect(types).toStrictEqual([nothing, nothing, nothing, nothing]);
    expect(stateTransitions).toStrictEqual([st, st, st, st]);
    expect(witnessRoots).toStrictEqual([
      Bool(false),
      Bool(false),
      Bool(false),
      Bool(false),
    ]);

    expect(stateTransitions2).toStrictEqual([
      st,
      st,
      st,
      ProvableStateTransition.dummy(),
    ]);
    expect(types2).toStrictEqual([
      closeAndApply,
      nothing,
      closeAndThrowAway,
      nothing,
    ]);
    expect(witnessRoots2).toStrictEqual([
      Bool(true),
      Bool(false),
      Bool(false),
      Bool(false),
    ]);
  });
});
