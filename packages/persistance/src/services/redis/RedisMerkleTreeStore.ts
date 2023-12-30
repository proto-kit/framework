import {
  AsyncMerkleTreeStore,
  MerkleTreeNode,
  MerkleTreeNodeQuery,
} from "@proto-kit/sequencer";
import { noop } from "@proto-kit/common";
import { inject, injectable } from "tsyringe";

import { RedisConnection } from "../../RedisConnection";

@injectable()
export class RedisMerkleTreeStore implements AsyncMerkleTreeStore {
  private cache: MerkleTreeNode[] = [];

  public constructor(
    @inject("Redis") private readonly connection: RedisConnection,
    private readonly mask: string = "base"
  ) {}

  public async openTransaction(): Promise<void> {
    noop();
  }

  private getKey(node: MerkleTreeNodeQuery): string {
    return `${this.mask}:${node.level}:${node.key.toString()}`;
  }

  public async commit(): Promise<void> {
    // TODO Filter distinct

    const start = Date.now();
    const array: [string, string][] = this.cache.map(
      ({ key, level, value }) => [this.getKey({ key, level }), value.toString()]
    );
    console.log(`Took ${Date.now() - start} ms`);

    const start2 = Date.now();

    if (array.length === 0) {
      return;
    }

    try {
      console.log(array.slice(0, 5).flat(1));
      await this.connection.client!.mSet(array.flat(1));
    } catch (e) {
      if (e instanceof Error) {
        console.log(e.name);
        console.log(e.message);
        console.log(e.stack);
      } else {
        console.log(e);
      }
    }

    console.log(`Took ${Date.now() - start2} ms`);
    // console.log(`Rows: ${rows}`);

    this.cache = [];
  }

  public async getNodesAsync(
    nodes: MerkleTreeNodeQuery[]
  ): Promise<(bigint | undefined)[]> {
    const keys = nodes.map((node) => this.getKey(node));

    const result = await this.connection.client!.mGet(keys);

    return result.map((x) => (x !== null ? BigInt(x) : undefined));
  }

  public writeNodes(nodes: MerkleTreeNode[]): void {
    this.cache = this.cache.concat(nodes);
  }
}
