import "reflect-metadata";
import { Bool, Field, Poseidon } from "o1js";

import {
  StateTransitionReductionList,
  reduceStateTransitions,
} from "../../src/utils/StateTransitionReductionList";
import {
  DefaultProvableHashList,
  ProvableStateTransition,
  StateTransition,
  Option,
} from "../../src";

interface UnprovableStateTransition {
  path: number;
  from: number;
  to: { isSome: boolean; value: number };
}

describe("provableReductionHashList", () => {
  function mapToProvable(
    sts: UnprovableStateTransition[]
  ): StateTransition<unknown>[] {
    return sts.map(
      (st) =>
        new StateTransition(
          Field(st.path),
          new Option(Bool(true), Field(st.from), Field, Bool(false)),
          new Option(Bool(st.to.isSome), Field(st.to.value), Field, Bool(false))
        ) as StateTransition<unknown>
    );
  }

  describe.each<[UnprovableStateTransition[], number]>([
    [
      [
        { path: 1, from: 5, to: { isSome: true, value: 10 } },
        { path: 1, from: 10, to: { isSome: true, value: 15 } },
      ],
      1,
    ],
    [
      [
        { path: 1, from: 5, to: { isSome: true, value: 10 } },
        { path: 1, from: 10, to: { isSome: false, value: 0 } },
      ],
      1,
    ],
    [
      [
        { path: 1, from: 5, to: { isSome: true, value: 10 } },
        { path: 1, from: 10, to: { isSome: false, value: 0 } },
        { path: 1, from: 10, to: { isSome: false, value: 0 } },
        { path: 5, from: 15, to: { isSome: false, value: 0 } },
        { path: 5, from: 15, to: { isSome: true, value: 20 } },
        { path: 1, from: 10, to: { isSome: false, value: 0 } },
        { path: 5, from: 20, to: { isSome: true, value: 25 } },
        { path: 5, from: 25, to: { isSome: true, value: 30 } },
      ],
      4,
    ],
  ])("should reduce and append correctly", (sts, reducedLength) => {
    it("start from empty list", () => {
      const reductionList = new StateTransitionReductionList(
        ProvableStateTransition
      );
      const normalList = new DefaultProvableHashList(ProvableStateTransition);

      const provableSTs = mapToProvable(sts);

      provableSTs.forEach((st) => {
        reductionList.push(st.toProvable());
      });

      const reduced = reduceStateTransitions(provableSTs);
      reduced.forEach((st) => {
        normalList.push(st.toProvable());
      });

      expect(reduced).toHaveLength(reducedLength);
      expect(normalList.commitment.toBigInt()).toStrictEqual(
        reductionList.commitment.toBigInt()
      );
      expect(reductionList.unconstrainedList).toHaveLength(reduced.length);
    });

    it("start from non-zero commitment - skip first reduction", () => {
      const commitment = Poseidon.hash([Field(123_456)]);
      const reductionList = new StateTransitionReductionList(
        ProvableStateTransition,
        commitment
      );
      const normalList = new DefaultProvableHashList(
        ProvableStateTransition,
        commitment
      );

      const provableSTs = mapToProvable(sts);

      provableSTs.forEach((st) => {
        reductionList.push(st.toProvable());
      });

      const reduced = reduceStateTransitions(provableSTs);
      reduced.forEach((st) => {
        normalList.push(st.toProvable());
      });

      expect(reduced).toHaveLength(reducedLength);
      expect(normalList.commitment.toBigInt()).toStrictEqual(
        reductionList.commitment.toBigInt()
      );
      expect(reductionList.unconstrainedList).toHaveLength(reduced.length);
    });
  });
});
