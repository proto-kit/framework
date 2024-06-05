import "reflect-metadata";
import { Option, StateTransition } from "@proto-kit/protocol";
import { Bool, Field } from "o1js";

import { UntypedStateTransition } from "../../../../src";

describe("stateTransition", () => {
  it.each([
    StateTransition.fromTo(
      Field("123"),
      Option.from(Bool(true), Field(5), Field),
      Option.fromValue(Field(100), Field)
    ),
    StateTransition.fromTo(
      Field("0"),
      (() => {
        const option = Option.from(Bool(true), Field(0), Field);
        option.isForcedSome = Bool(true);
        return option;
      })(),
      Option.fromValue(Field(100), Field)
    ),
    StateTransition.fromTo(
      Field(2n ** 255n),
      Option.from(Bool(true), Field(5), Field),
      Option.from(Bool(false), Field(0), Field)
    ),
  ])("should map to UntypedST correctly", (st) => {
    expect.assertions(8);

    const untyped = UntypedStateTransition.fromStateTransition(st);

    expect(untyped.path).toStrictEqual(st.path);

    expect(untyped.fromValue.value).toStrictEqual(
      st.fromValue.valueType.toFields(st.fromValue.value)
    );
    expect(untyped.fromValue.isSome.toBoolean()).toStrictEqual(
      st.fromValue.isSome.toBoolean()
    );
    expect(untyped.fromValue.isForcedSome.toBoolean()).toStrictEqual(
      st.fromValue.isForcedSome.toBoolean()
    );

    expect(untyped.toValue.value).toStrictEqual(
      st.toValue.valueType.toFields(st.toValue.value)
    );
    expect(untyped.toValue.isSome.toBoolean()).toStrictEqual(
      st.toValue.isSome.toBoolean()
    );
    expect(untyped.toValue.isForcedSome.toBoolean()).toStrictEqual(
      st.toValue.isForcedSome.toBoolean()
    );

    const provable1 = st.toProvable();
    const provable2 = untyped.toProvable();

    expect(provable1).toStrictEqual(provable2);
  });
});
