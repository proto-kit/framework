import { startServer } from "../src";
import { sleep } from "@proto-kit/common";

describe("Start", () => {
  it("a", async () => {
    await startServer();
    await sleep(10000000);
  }, 10000000);
});
