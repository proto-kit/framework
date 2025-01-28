import "reflect-metadata";
import { getInjectAliases, injectAlias } from "../../src/config/injectAlias";

@injectAlias(["foo", "bar"])
class TestClass {}

@injectAlias(["ayy"])
class TestClass2 extends TestClass {}

describe("injectAlias metadata", () => {
  it("set and retrieve", () => {
    expect.assertions(2);

    const aliases = getInjectAliases(TestClass);

    expect(aliases).toHaveLength(2);
    expect(aliases).toStrictEqual(["foo", "bar"]);
  });

  it("recursive", () => {
    expect.assertions(2);

    const aliases = getInjectAliases(TestClass2);

    expect(aliases).toHaveLength(3);
    expect(aliases).toStrictEqual(["ayy", "foo", "bar"]);
  });
});
