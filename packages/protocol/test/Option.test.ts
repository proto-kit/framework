import { Bool, Field, Poseidon } from "o1js";

import {
  Option,
  ProvableOption,
  ProvableStateTransition,
  StateTransition,
} from "../src";

describe("option", () => {
  it.each([
    [
      Option.from(Bool(true), Field(5), Bool(false), Field),
      { isSome: true, value: Poseidon.hash([Field(5)]) },
    ],
    [
      Option.from(Bool(true), Field(0), Bool(false), Field),
      { isSome: true, value: Poseidon.hash([Field(0)]) },
    ],
    [
      Option.from(Bool(true), Field(0), Bool(true), Field),
      { isSome: true, value: Field(0) },
    ],
    [
      Option.from(Bool(false), Field(1), Bool(false), Field),
      { isSome: false, value: Poseidon.hash([Field(1)]) },
    ],
  ])("should encode to correct provable", (option, provableTemplate) => {
    expect.assertions(4);

    const provableInput = new ProvableOption({
      isSome: Bool(provableTemplate.isSome),
      value: provableTemplate.value,
    });

    const provable = option.toProvable();
    const fields = ProvableOption.toFields(provable);

    expect(provable.value.toBigInt()).toStrictEqual(
      provableInput.value.toBigInt()
    );
    expect(provable.isSome.toBoolean()).toStrictEqual(
      provableInput.isSome.toBoolean()
    );

    expect(fields[0]).toStrictEqual(provableInput.isSome.toFields()[0]);
    expect(fields[1]).toStrictEqual(provableInput.value);
  });
});

describe.skip("StateTransition", () => {
  it.each([
    StateTransition.fromTo(
      Field(
        "12400094993176908175853015388851707312254268028646194084157588096832563763032"
      ),
      Option.fromValue(Field(0), Field),
      Option.fromValue(Field(100), Field)
    ),
  ])("should encode StateTransition correctly", (st) => {
    const provable = st.toProvable();
    console.log(ProvableStateTransition.toJSON(provable));
  });
});
