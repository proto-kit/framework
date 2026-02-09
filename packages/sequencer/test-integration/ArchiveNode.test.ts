import { describe } from "@jest/globals";

import { ArchiveNode } from "../src/settlement/utils/ArchiveNode";

describe("ArchiveNode", () => {
  it("should resolve", async () => {
    const config = {
      network: {
        type: "lightnet" as const,
        graphql: "http://127.0.0.1:8080/graphql",
        archive: "http://127.0.0.1:8282",
      },
    };

    // We don't know the exact block numbers, but any will be fine
    await expect(
      ArchiveNode.waitOnSync(config)
    ).resolves.toBeGreaterThanOrEqual(0);
  });
});
