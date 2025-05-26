import { describe } from "@jest/globals";

import { ArchiveNode } from "../src/settlement/utils/ArchiveNode";
import { TokenId } from "o1js";

describe("ArchiveNode", () => {
  it("should resolve", async () => {
    const config = {
      network: {
        type: "lightnet" as const,
        graphql: "http://127.0.0.1:8080/graphql",
        archive: "http://127.0.0.1:8282",
      },
    };

    await expect(ArchiveNode.waitOnSync(config)).resolves.toBe(true);
  });
});
