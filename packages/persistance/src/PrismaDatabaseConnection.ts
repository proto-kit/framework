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
  connection?: {
    username: string;
    password: string;
    host: string;
    port?: number;
    db?: {
      name: string;
      schema?: string;
    };
  };
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
      blockStorage: {
        useClass: PrismaBatchStore,
      },
      unprovenBlockQueue: {
        useClass: PrismaBlockStorage,
      },
      unprovenBlockStorage: {
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

  public async clearDatabase(): Promise<void> {
    const tables = [
      "TransactionExecutionResult",
      "Transaction",
      "Block",
      "Batch",
      "UnprovenBlockMetadata",
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

  public async start(): Promise<void> {
    const { connection } = this.config;
    if (connection !== undefined) {
      const { host, port, username, password, db } = connection;

      const dbString =
        db !== undefined
          ? `${db.name}?schema=${db.schema ?? "public"}`
          : "protokit?schema=public";

      const url = `postgresql://${username}:${password}@${host}:${
        port ?? 5432
      }/${dbString}`;

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
}
