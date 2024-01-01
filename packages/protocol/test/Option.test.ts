import {
  Option,
  ProvableOption,
  ProvableStateTransition,
  StateTransition,
} from "../src";
import { Bool, Field, Poseidon, Struct } from "o1js";

describe("Option", () => {
  const forcedOption = Option.from(Bool(false), Field(0), Field);
  forcedOption.forceSome();

  it.each([
    [Option.from(Bool(true), Field(5), Field), Poseidon.hash([Field(5)])],
    [forcedOption, Field(0)],
  ])("should encode to correct treeValue", (option, treeValue) => {
    expect(treeValue.toBigInt()).toStrictEqual(option.treeValue.toBigInt());

    const provable = option.toProvable();
    const fields = ProvableOption.toFields(provable);
    expect(fields[0]).toStrictEqual(option.isSome.toFields()[0]);
    expect(fields[1]).toStrictEqual(treeValue);
  });
});

describe("StateTransition", () => {
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
