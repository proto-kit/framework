import { Provable } from "o1js";

import { ProvableOption } from "../model/Option";
import {
  ProvableStateTransition,
  StateTransition,
} from "../model/StateTransition";

import { ProvableReductionHashList } from "./ProvableReductionHashList";

export class StateTransitionReductionList extends ProvableReductionHashList<ProvableStateTransition> {
  public push(value: ProvableStateTransition) {
    this.pushWithMetadata(value);

    return this;
  }

  public pushWithMetadata(value: ProvableStateTransition) {
    return this.pushAndReduce(value, (previous: ProvableStateTransition) => {
      const pathsMatch = previous.path.equals(value.path);

      // Take the previous.from if the paths match, otherwise leave ST as is
      const from = Provable.if(
        pathsMatch,
        ProvableOption,
        previous.from,
        value.from
      );
      // In case we have a layout like
      // { from: 5, to: 10 }, { from: 10, to: none }
      // we just take the first and discard the second
      const to = Provable.if(
        value.to.isSome.or(pathsMatch.not()),
        ProvableOption,
        value.to,
        previous.to
      );

      const transition = new ProvableStateTransition({
        path: value.path,
        from: new ProvableOption(from),
        to: new ProvableOption(to),
      });

      // Assert that connection is correct
      previous.to.value
        .equals(value.from.value)
        .or(
          previous.to.isSome
            .not()
            .and(previous.from.value.equals(value.from.value))
        )
        .or(pathsMatch.not())
        .assertTrue();

      return [transition, pathsMatch];
    });
  }
}

export function reduceStateTransitions(
  transitions: StateTransition<unknown>[]
): StateTransition<unknown>[] {
  const reduced: StateTransition<unknown>[] = [];

  transitions.forEach((st) => {
    if (reduced.length === 0) {
      reduced.push(st);
      return;
    }

    const last = reduced.at(-1)!;
    if (last.path.equals(st.path).toBoolean()) {
      if (st.toValue.isSome.toBoolean()) {
        reduced.pop();
        reduced.push(
          new StateTransition<unknown>(st.path, last.fromValue, st.toValue)
        );
      } else {
        // Do nothing, because we discard that ST
        // { from: 5, to: 10 }, { from: 10, to: none }
        // cancel the 2nd
      }
    } else {
      reduced.push(st);
    }
  });
  return reduced;
}
