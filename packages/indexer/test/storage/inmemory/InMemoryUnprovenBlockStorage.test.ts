import "reflect-metadata";
import {
  TransactionExecutionResult,
  UnprovenBlockWithMetadata,
} from "@proto-kit/sequencer";
import { Field } from "o1js";

import { InMemoryUnprovenBlockStorage } from "../../../src/storage/inmemory/InMemoryUnprovenBlockStorage";

const { block } = UnprovenBlockWithMetadata.createEmpty();

describe("InMemoryUnprovenBlockStorage", () => {
  let storage = new InMemoryUnprovenBlockStorage();

  beforeAll(async () => {
    storage = new InMemoryUnprovenBlockStorage();
    for (let i = 0; i < 10; i++) {
      await storage.pushBlock({
        block: {
          ...block,
          hash: Field(i),
          height: Field(i),
          transactions: i === 5 ? [{} as TransactionExecutionResult] : [],
        },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        metadata: {} as any,
      });
    }
  });

  it("should push a block and return the correct current block height", async () => {
    const currentBlockHeight = await storage.getCurrentBlockHeight();
    expect(currentBlockHeight).toBe(9);
  });

  describe("getBlocks", () => {
    // reset the storage and populate it with 10 dummy blocks

    describe("pagination", () => {
      it("should get the first block", async () => {
        const { items: blocks, totalCount } = await storage.getBlocks({
          take: 1,
        });
        expect(blocks.length).toBe(1);
        expect(blocks[0].block.height.toString()).toBe("9");
        expect(totalCount).toBe(10);
      });

      it("should get the second block", async () => {
        const { items: blocks } = await storage.getBlocks({ take: 1, skip: 1 });
        expect(blocks.length).toBe(1);
        expect(blocks[0].block.height.toString()).toBe("8");
      });

      it("should take the 5 latest blocks", async () => {
        const { items: blocks } = await storage.getBlocks({ take: 5 });
        expect(blocks.length).toBe(5);
        expect(blocks[0].block.height.toString()).toBe("9");
        expect(blocks[1].block.height.toString()).toBe("8");
        expect(blocks[2].block.height.toString()).toBe("7");
        expect(blocks[3].block.height.toString()).toBe("6");
        expect(blocks[4].block.height.toString()).toBe("5");
      });
    });

    describe("filters", () => {
      it("should filter blocks by hash", async () => {
        const { items: blocks } = await storage.getBlocks(
          { take: 100 },
          {
            hash: "1",
          }
        );

        expect(blocks.length).toBe(1);
        expect(blocks[0].block.hash.toString()).toBe("1");
      });

      it("should filter blocks by height", async () => {
        const { items: blocks } = await storage.getBlocks(
          { take: 100 },
          {
            hash: "1",
          }
        );

        expect(blocks.length).toBe(1);
        expect(blocks[0].block.hash.toString()).toBe("1");
      });

      it("should filter for blocks that are empty", async () => {
        const { items: blocks } = await storage.getBlocks(
          { take: 100 },
          {
            hideEmpty: true,
          }
        );

        expect(blocks.length).toBe(9);
      });

      it("should filter for blocks that are not empty", async () => {
        const { items: blocks } = await storage.getBlocks(
          { take: 100 },
          {
            hideEmpty: false,
          }
        );

        expect(blocks.length).toBe(10);
      });
    });
  });
});
