import { UntypedOption, UntypedStateTransition } from "../../../../src";
import {
  Option,
  ProvableStateTransition,
  StateTransition,
} from "@proto-kit/protocol";
import { Bool, Field } from "o1js";

describe("stateTransition", () => {
  it.each([
    StateTransition.fromTo(
      Field("123"),
      Option.from(Bool(true), Field(5), Bool(false), Field),
      Option.fromValue(Field(100), Field)
    ),
    StateTransition.fromTo(
      Field("0"),
      Option.from(Bool(true), Field(0), Bool(true), Field),
      Option.fromValue(Field(100), Field)
    ),
    StateTransition.fromTo(
      Field(2n ** 255n),
      Option.from(Bool(true), Field(5), Bool(false), Field),
      Option.from(Bool(false), Field(0), Bool(false), Field)
    ),
  ])("should map to UntypedST correctly", (st) => {
    expect.assertions(8);

    const untyped = UntypedStateTransition.fromStateTransition(st);

    expect(untyped.path).toStrictEqual(st.path);

    expect(untyped.fromValue.value).toStrictEqual(
      st.fromValue.valueType.toFields(st.fromValue.value)
    );
    expect(untyped.fromValue.isSome).toStrictEqual(st.fromValue.isSome);
    expect(untyped.fromValue.enforceEmpty).toStrictEqual(
      st.fromValue.enforceEmpty
    );

    expect(untyped.toValue.value).toStrictEqual(
      st.toValue.valueType.toFields(st.toValue.value)
    );
    expect(untyped.toValue.isSome).toStrictEqual(st.toValue.isSome);
    expect(untyped.toValue.enforceEmpty).toStrictEqual(st.toValue.enforceEmpty);

    const provable1 = st.toProvable();
    const provable2 = untyped.toProvable();

    expect(provable1).toStrictEqual(provable2);
  });
});
