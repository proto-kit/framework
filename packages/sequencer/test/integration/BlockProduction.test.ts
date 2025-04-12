import { InMemoryDatabase } from "../../src";
import { testBlockProduction } from "./BlockProduction-test";

describe("block production", () => {
  testBlockProduction(InMemoryDatabase, {});
});
