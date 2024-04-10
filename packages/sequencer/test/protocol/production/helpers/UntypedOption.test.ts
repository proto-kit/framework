import "reflect-metadata";
import { Bool, Field } from "o1js";
import { Option } from "@proto-kit/protocol";

import { UntypedOption } from "../../../../src";

describe("option <-> untypedoption", () => {
  function forceSome<T>(option: Option<T>): Option<T> {
    option.isForcedSome = Bool(true);
    return option;
  }

  it.each([
    [Option.from(Bool(true), Field(5), Field)],
    [Option.from(Bool(true), Field(0), Field)],
    [forceSome(Option.from(Bool(true), Field(0), Field))],
    [Option.from(Bool(false), Field(1), Field)],
  ])("should map to untyped correctly", (option) => {
    expect.assertions(4);

    const untyped = UntypedOption.fromOption(option);

    expect(untyped.isSome.toBoolean()).toStrictEqual(option.isSome.toBoolean());
    expect(untyped.isForcedSome.toBoolean()).toStrictEqual(
      option.isForcedSome.toBoolean()
    );
    expect(untyped.value).toStrictEqual(
      option.valueType.toFields(option.value)
    );

    const provable1 = option.toProvable();
    const provable2 = untyped.toProvable();

    expect(provable1).toStrictEqual(provable2);
  });
});
