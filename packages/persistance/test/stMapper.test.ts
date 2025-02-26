import "reflect-metadata";

import { UntypedStateTransition } from "@proto-kit/sequencer";

import { StateTransitionMapper } from "../src";

describe("StMapper", () => {
  it.each([
    // {
    //   path: "1234",
    //   from: { isSome: true, value: ["12345"], isForcedSome: false },
    //   to: { isSome: true, value: ["6789"], isForcedSome: false },
    // },
    {
      path: "5678",
      from: { isSome: false, value: [], isForcedSome: false },
      to: { isSome: false, value: [], isForcedSome: false },
    },
  ])("MapOut to MapIn", (input) => {
    const untypedTransition = UntypedStateTransition.fromJSON(input);
    const stMapper = new StateTransitionMapper();
    const result = stMapper.mapIn(stMapper.mapOut(untypedTransition)).toJSON();
    expect(result).toEqual(input);
  });
});
