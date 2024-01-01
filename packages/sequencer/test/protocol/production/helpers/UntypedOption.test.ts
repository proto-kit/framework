import { Bool, Field, Poseidon } from "o1js";
import {
  Option,
  ProvableStateTransition,
  StateTransition,
} from "@proto-kit/protocol";
import { UntypedOption, UntypedStateTransition } from "../../../../src";

describe("Option", () => {
  it.each([
    [Option.from(Bool(true), Field(5), Bool(false), Field)],
    [Option.from(Bool(true), Field(0), Bool(false), Field)],
    [Option.from(Bool(true), Field(0), Bool(true), Field)],
    [Option.from(Bool(false), Field(1), Bool(false), Field)],
  ])("should map to untyped correctly", (option) => {
    expect.assertions(4);

    const untyped = UntypedOption.fromOption(option);

    expect(untyped.isSome.toBoolean()).toStrictEqual(option.isSome.toBoolean());
    expect(untyped.enforceEmpty.toBoolean()).toStrictEqual(
      option.enforceEmpty.toBoolean()
    );
    expect(untyped.value).toStrictEqual(
      option.valueType.toFields(option.value)
    );

    const provable1 = option.toProvable();
    const provable2 = untyped.toProvable();

    expect(provable1).toStrictEqual(provable2);
  });
});