import { Bool, Field, Poseidon } from "o1js";
import { Option, ProvableStateTransition, StateTransition } from "@proto-kit/protocol";
import { UntypedOption, UntypedStateTransition } from "../../../../src";

describe("Option", () => {
  it.each([
    [
      UntypedOption.fromOption(Option.from(Bool(true), Field(5), Field)),
      Poseidon.hash([Field(5)]),
    ],
  ])("should encode to correct treeValue", (option, treeValue) => {
    expect(treeValue.toBigInt()).toStrictEqual(option.treeValue.toBigInt());
  });
});

describe("StateTransition", () => {
  it.each([
    UntypedStateTransition.fromStateTransition(
      StateTransition.fromTo(
        Field(
          "12400094993176908175853015388851707312254268028646194084157588096832563763032"
        ),
        (() => {
          const option = Option.from(Bool(false), Field(0), Field);
          option.forceSome();
          return option
        })(),
        Option.fromValue(Field(100), Field)
      )
    ),
  ])("should encode StateTransition correctly", (st) => {
    const provable = st.toProvable();
    console.log(ProvableStateTransition.toJSON(provable));
  });

  it("should map correctly", () => {
    const option = Option.from(Bool(false), Field(0), Field);
    option.forceSome();

    const untyped = UntypedOption.fromOption(option);
    console.log(option.toJSON())
    console.log(untyped.toJSON())

    expect(untyped.isSome.toBoolean()).toBe(true);
  })

  it("should have the same .toFields()", () => {
    const st = StateTransition.fromTo(
      Field(
        "6406289166010634593491302759799660643803204126177439840849501559393161142416"
      ),
      (() => {
        const option = Option.from(Bool(false), Field(0), Field);
        option.forceSome();
        return option
      })(),
      Option.fromValue(Field(100), Field)
    );
    const untyped = UntypedStateTransition.fromStateTransition(st);

    expect(untyped.fromValue.isSome.toBoolean()).toBe(true)
    expect(untyped.fromValue.isForcedSome.toBoolean()).toBe(true)

    const fields1 = ProvableStateTransition.toFields(st.toProvable());
    const fields2 = ProvableStateTransition.toFields(untyped.toProvable());

    expect.assertions(fields1.length + 1);

    expect(fields1).toHaveLength(fields2.length);

    fields1.forEach((f, index) => {
      expect(f.toBigInt()).toStrictEqual(fields2[index].toBigInt())
    })
  })
});
