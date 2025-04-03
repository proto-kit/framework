import { sleep } from "@proto-kit/common";

import { startServer } from "../src";

describe.skip("Start", () => {
  it("a", async () => {
    await startServer();
    await sleep(10000000);
  }, 10000000);
});
