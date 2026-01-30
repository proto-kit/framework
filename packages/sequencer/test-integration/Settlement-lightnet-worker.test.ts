import { PrivateKey } from "o1js";
import { log } from "@proto-kit/common";
import { FungibleToken } from "mina-fungible-token";
import { BullQueueConfig } from "@proto-kit/deployment";
import { afterAll, beforeAll } from "@jest/globals";

import { settlementTestFn } from "../test/settlement/Settlement";

import { ChildProcessWorker } from "./workers/ChildProcessWorker";
import { BullConfig } from "./workers/modules";

console.log(PrivateKey.random().toPublicKey().toBase58());

log.setLevel("DEBUG");

describe.skip.each(["signed"] as const)(
  "settlement contracts: workers + lightnet - %s",
  (type) => {
    const network = {
      network: {
        type: "lightnet",
        graphql: "http://127.0.0.1:8080/graphql",
        archive: "http://127.0.0.1:8282",
        accountManager: "http://127.0.0.1:8181",
      },
    } as const;

    const queue: BullQueueConfig = {
      redis: BullConfig.redis,
      retryAttempts: 2,
    };

    const worker = new ChildProcessWorker();

    beforeAll(() => {
      console.error("Starting");
      worker.start(
        "worker-0",
        "./test-integration/settlement-worker.ts",
        true,
        {
          PROOFS_ENABLED: "false",
        }
      );
    });

    afterAll(() => {
      worker.kill();
    });

    describe("Default token", () => {
      settlementTestFn(type, network, undefined, 360_000, queue);
    });

    describe.skip("Custom token", () => {
      settlementTestFn(
        type,
        network,
        {
          tokenOwner: FungibleToken,
        },
        360_000,
        queue
      );
    });
  }
);
