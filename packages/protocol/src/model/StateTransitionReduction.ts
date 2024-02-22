import { StateTransition } from "./StateTransition";

export function reduceStateTransitions(
  transitions: StateTransition<unknown>[]
): StateTransition<unknown>[] {
  const reduced: StateTransition<unknown>[] = [];

  for (const st of transitions) {
    if (reduced.length === 0) {
      reduced.push(st);
      continue;
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
  }
  return reduced;
}
