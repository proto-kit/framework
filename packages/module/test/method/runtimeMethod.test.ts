import "reflect-metadata";

import { Bool, Field } from "o1js";
import { Option, StateTransition } from "@proto-kit/protocol";

import { toStateTransitionsHash } from "../../src/method/runtimeMethod";

describe.skip("toStateTransitionsHash", () => {
  const noneStateTransition = StateTransition.from(
    Field(0),
    new Option(Bool(false), Field(0), Field)
  );

  const someStateTransition = StateTransition.from(
    Field(0),
    new Option(Bool(true), Field(0), Field)
  );

  it.each([
    [
      [noneStateTransition],
      "7067243248312463521220230733411703436580237248681301130001246160136823979683",
    ],
    [
      [someStateTransition],
      "12841542804403638489097503092490970035615082088155587790175618374946575398395",
    ],
    [
      [noneStateTransition, someStateTransition],
      "20641278138648130746922286021889771603940136555847557324578879341962747943601",
    ],
    [
      [someStateTransition, noneStateTransition],
      "10362098987098600767020985423446775093761176563902435645494178193997179006954",
    ],
  ])(
    "should calculate a hash of all provided state transitions",
    (stateTransitions, expectedHash) => {
      expect.assertions(1);

      const hash = toStateTransitionsHash(stateTransitions).toString();

      expect(hash).toBe(expectedHash);
    }
  );
});
