import { sleep } from "@proto-kit/common";

import { AppChain } from "../../src";

import { startServer } from "./graphql";

describe("run graphql", () => {
  let appchain: AppChain<any, any, any, any>;

  afterAll(async () => {
    await appchain.close();
  });

  it("run", async () => {
    appchain = await startServer();
    await sleep(1000000000);
  }, 1000000000);
});
