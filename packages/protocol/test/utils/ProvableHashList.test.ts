import "reflect-metadata";
import { Bool, Field, Poseidon } from "o1js";

import { DefaultProvableHashList } from "../../src";

describe("defaultProvableHashList", () => {
  describe.each([
    [0, [{ value: 1n, push: true }]],
    // [
    //   10,
    //   [
    //     { value: 1n, push: true },
    //     { value: 5n, push: false },
    //   ],
    // ],
    // [
    //   10,
    //   [
    //     { value: 1n, push: true },
    //     { value: 5n, push: false },
    //     { value: 6n, push: true },
    //   ],
    // ],
  ])("should correctly append and save", (start, elements) => {
    it("Using only pushIf", () => {
      const hashList = new DefaultProvableHashList(Field, Field(start));

      // eslint-disable-next-line sonarjs/no-unused-collection
      const appended: bigint[] = [];
      let hash = Field(start);

      for (const element of elements) {
        hashList.pushIf(Field(element.value), Bool(element.push));
        if (element.push) {
          appended.push(element.value);

          hash = Poseidon.hash([hash, Field(element.value)]);
        }
      }

      expect(hash.toString()).toStrictEqual(hashList.commitment.toString());
    });
  });
});
