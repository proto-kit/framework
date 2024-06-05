import "reflect-metadata";
import { distinct, distinctByPredicate } from "../src";

describe("distinctByPredicate", () => {
  it.each([[["a", "a"]], [["a", "b", "c", "b", "a", "d"]]])(
    "should achieve parity with distinct using primitives",
    (array) => {
      expect.assertions(2);

      const expected = array.filter(distinct);

      const predicateDistinct = array.filter(
        distinctByPredicate((a, b) => a === b)
      );

      expect(expected).toHaveLength(predicateDistinct.length);
      expect(expected).toStrictEqual(predicateDistinct);
    }
  );
});
