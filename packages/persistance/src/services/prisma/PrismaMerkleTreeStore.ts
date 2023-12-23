import {
  AsyncMerkleTreeStore,
  MerkleTreeNode,
  MerkleTreeNodeQuery,
} from "@proto-kit/sequencer";

import { PrismaDatabaseConnection } from "../../PrismaDatabaseConnection";
import { noop } from "@proto-kit/common";
import { Prisma } from "@prisma/client";

/**
 * @deprecated
 */
export class PrismaMerkleTreeStore implements AsyncMerkleTreeStore {
  private cache: MerkleTreeNode[] = [];

  public constructor(private readonly connection: PrismaDatabaseConnection) {}

  public async openTransaction(): Promise<void> {
    noop();
  }

  public async commit(): Promise<void> {
    // TODO Filter distinct

    const start = Date.now();
    const array: [Prisma.Decimal, number, Prisma.Decimal][] = this.cache.map(
      ({ key, level, value }) => [
        new Prisma.Decimal(key.toString()),
        level,
        new Prisma.Decimal(value.toString()),
      ]
    );
    console.log(`Took ${Date.now() - start} ms`)

    const start2 = Date.now();
    const rows = await this.connection.client.$executeRaw(
      Prisma.sql`INSERT INTO "TreeElement" (key, level, value) VALUES ${Prisma.join(
        array.map((entry) => Prisma.sql`(${Prisma.join(entry)})`)
      )} ON CONFLICT ON CONSTRAINT "TreeElement_pkey" DO UPDATE SET value = EXCLUDED.value;`
    );
    console.log(`Took ${Date.now() - start2} ms`)
    console.log(`Rows: ${rows}`)

    this.cache = [];
  }

  public async getNodesAsync(
    nodes: MerkleTreeNodeQuery[]
  ): Promise<(bigint | undefined)[]> {
    // this.connection.client.treeElement.create({
    //   data: {
    //     key: new Prisma.Decimal(123)
    //   }
    // })
    // const result = await this.connection.client.treeElement.findMany({
    //   where: {
    //
    //     key: {
    //       in: nodes.map(x => x.key)
    //     }
    //   }
    // })
    return Array(nodes.length).fill(undefined);
  }

  public writeNodes(nodes: MerkleTreeNode[]): void {
    this.cache = this.cache.concat(nodes);
  }
}
