import {
  AsyncMerkleTreeStore,
  MerkleTreeNode,
  MerkleTreeNodeQuery,
} from "@proto-kit/sequencer";
import { log, noop } from "@proto-kit/common";

import type { RedisConnection } from "../../RedisConnection";

export class RedisMerkleTreeStore implements AsyncMerkleTreeStore {
  private cache: MerkleTreeNode[] = [];

  public constructor(
    private readonly connection: RedisConnection,
    private readonly mask: string = "base"
  ) {}

  private getKey(node: MerkleTreeNodeQuery): string {
    return `${this.mask}:${node.level}:${node.key.toString()}`;
  }

  public async openTransaction(): Promise<void> {
    noop();
  }

  public async commit(): Promise<void> {
    const start = Date.now();
    const array: [string, string][] = this.cache.map(
      ({ key, level, value }) => [this.getKey({ key, level }), value.toString()]
    );

    if (array.length === 0) {
      return;
    }

    try {
      await this.connection.redisClient.mSet(array.flat(1));
    } catch (error) {
      log.error(error);
    }
    log.trace(
      `Committing ${array.length} kv-pairs took ${Date.now() - start} ms`
    );

    this.cache = [];
  }

  public async getNodesAsync(
    nodes: MerkleTreeNodeQuery[]
  ): Promise<(bigint | undefined)[]> {
    if (nodes.length === 0) {
      return [];
    }

    const keys = nodes.map((node) => this.getKey(node));

    const result = await this.connection.redisClient.mGet(keys);

    return result.map((x) => (x !== null ? BigInt(x) : undefined));
  }

  public writeNodes(nodes: MerkleTreeNode[]): void {
    this.cache = this.cache.concat(nodes);
    // TODO Filter distinct
    // We might not even need this, since the distinctness filter might already
    // be implicitely done by the layer above (i.e. cachedmtstore)

    // Leaving this for now until I get to implementing it
    // const concat = this.cache.concat(nodes);
    // const reversed = concat.slice().reverse();
    // this.cache = concat.filter((node, index) => {
    //   const reversedIndex = concat.length - 1 - index;
    //   // We find the last item with that particular (key + value) id.
    //   // This is the one we want to use.
    //   const foundIndex = reversed.findIndex(
    //     ({ key, value }) => key === node.key && value === node.value
    //   );
    //   // Now we only take this item is the found item
    //   return foundIndex === reversedIndex;
    // });
    // console.log(`Reduced ${concat.length} to ${this.cache.length} items to write`)
  }
}
