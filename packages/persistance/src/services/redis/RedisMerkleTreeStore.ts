import {
  AsyncMerkleTreeStore,
  MerkleTreeNode,
  MerkleTreeNodeQuery,
} from "@proto-kit/sequencer";

import { noop } from "@proto-kit/common";
import { Prisma } from "@prisma/client";
import { RedisConnection } from "../../RedisConnection";

export class RedisMerkleTreeStore implements AsyncMerkleTreeStore {
  private cache: MerkleTreeNode[] = [];

  public constructor(private readonly connection: RedisConnection) {}

  public async openTransaction(): Promise<void> {
    noop();
  }

  public async commit(): Promise<void> {
    // TODO Filter distinct

    const start = Date.now();
    const array: [string, string][] = this.cache.map(
      ({ key, level, value }) => {
        const s = key.toString()
        // const padded = Array(78 - s.length).fill("0").join("") + s;
        return [
          level + ":" + s,
          value.toString()
          // Buffer.from(padded + ":" + level),
          // Buffer.from(value.toString())
        ]
      }
    );
    console.log(`Took ${Date.now() - start} ms`);

    const start2 = Date.now();

    if(array.length === 0){
      return;
    }

    try {
      console.log(array.slice(0, 5).flat(1))
      await this.connection.client!.mSet(array.flat(1));
    }catch(e){
      if(e instanceof Error){
        console.log(e.name)
        console.log(e.message)
        console.log(e.stack)
      }else{
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
    const keys = nodes.map(node => node.level + ":" + node.key.toString())

    const result = await this.connection.client!.mGet(keys);

    return result.map(x => x !== null ? BigInt(x) : undefined)
  }

  public writeNodes(nodes: MerkleTreeNode[]): void {
    this.cache = this.cache.concat(nodes);
  }
}
