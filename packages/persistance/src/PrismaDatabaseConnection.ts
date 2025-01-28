import { PrismaClient } from "@prisma/client";
import {
  sequencerModule,
  SequencerModule,
  StorageDependencyMinimumDependencies,
} from "@proto-kit/sequencer";
import { DependencyFactory, OmitKeys } from "@proto-kit/common";

import { PrismaStateService } from "./services/prisma/PrismaStateService";
import { PrismaBatchStore } from "./services/prisma/PrismaBatchStore";
import { PrismaBlockStorage } from "./services/prisma/PrismaBlockStorage";
import { PrismaSettlementStorage } from "./services/prisma/PrismaSettlementStorage";
import { PrismaMessageStorage } from "./services/prisma/PrismaMessageStorage";
import { PrismaTransactionStorage } from "./services/prisma/PrismaTransactionStorage";

export interface PrismaDatabaseConfig {
  // Either object-based config or connection string
  connection?:
    | {
        username: string;
        password: string;
        host: string;
        port?: number;
        db?: {
          name: string;
          schema?: string;
        };
      }
    | string;
}

export interface PrismaConnection {
  get prismaClient(): PrismaClient;
}

@sequencerModule()
export class PrismaDatabaseConnection
  extends SequencerModule<PrismaDatabaseConfig>
  implements DependencyFactory, PrismaConnection
{
  private initializedClient: PrismaClient | undefined = undefined;

  public get prismaClient(): PrismaClient {
    if (this.initializedClient === undefined) {
      throw new Error("Client not initialized yet, wait for after the startup");
    }
    return this.initializedClient;
  }

  public dependencies(): OmitKeys<
    StorageDependencyMinimumDependencies,
    "asyncMerkleStore" | "blockTreeStore" | "unprovenMerkleStore"
  > {
    return {
      asyncStateService: {
        useFactory: () => new PrismaStateService(this, "batch"),
      },
      batchStorage: {
        useClass: PrismaBatchStore,
      },
      blockQueue: {
        useClass: PrismaBlockStorage,
      },
      blockStorage: {
        useClass: PrismaBlockStorage,
      },
      unprovenStateService: {
        useFactory: () => new PrismaStateService(this, "block"),
      },
      settlementStorage: {
        useClass: PrismaSettlementStorage,
      },
      messageStorage: {
        useClass: PrismaMessageStorage,
      },
      transactionStorage: {
        useClass: PrismaTransactionStorage,
      },
    };
  }

  public async pruneDatabase(): Promise<void> {
    const tables = [
      "TransactionExecutionResult",
      "Transaction",
      "Block",
      "Batch",
      "BlockResult",
      "State",
      "Settlement",
      "IncomingMessageBatch",
      "IncomingMessageBatchTransaction",
    ];

    await this.prismaClient.$transaction(
      tables.map((table) =>
        this.prismaClient.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`)
      )
    );
  }

  private buildConnectionString(
    connection: Exclude<NonNullable<PrismaDatabaseConfig["connection"]>, string>
  ): string {
    const { host, port, username, password, db } = connection;

    const dbString =
      db !== undefined
        ? `${db.name}?schema=${db.schema ?? "public"}`
        : "protokit?schema=public";

    return `postgresql://${username}:${password}@${host}:${
      port ?? 5432
    }/${dbString}`;
  }

  public async start(): Promise<void> {
    const { connection } = this.config;
    if (connection !== undefined) {
      const url =
        typeof connection === "string"
          ? connection
          : this.buildConnectionString(connection);

      this.initializedClient = new PrismaClient({
        datasources: {
          db: {
            url,
          },
        },
      });
    } else {
      this.initializedClient = new PrismaClient();
    }
  }

  public async close() {
    await this.prismaClient.$disconnect();
  }

  public async executeInTransaction(f: () => Promise<void>) {
    await this.prismaClient.$transaction(f);
  }
}
