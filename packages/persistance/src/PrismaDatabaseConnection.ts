import { Prisma, PrismaClient } from "@prisma/client";
import {
  sequencerModule,
  SequencerModule,
  StorageDependencyMinimumDependencies,
  Tracer,
} from "@proto-kit/sequencer";
import { OmitKeys } from "@proto-kit/common";

import { PrismaStateService } from "./services/prisma/PrismaStateService";
import { PrismaBatchStore } from "./services/prisma/PrismaBatchStore";
import { PrismaBlockStorage } from "./services/prisma/PrismaBlockStorage";
import { PrismaSettlementStorage } from "./services/prisma/PrismaSettlementStorage";
import { PrismaMessageStorage } from "./services/prisma/PrismaMessageStorage";
import { PrismaTransactionStorage } from "./services/prisma/PrismaTransactionStorage";
import { PrismaLinkedLeafStore } from "./services/prisma/PrismaLinkedLeafStore";
import { PrismaPropertyStorage } from "./services/prisma/PrismaPropertyStorage";

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
  log?: (Prisma.LogLevel | Prisma.LogDefinition)[];
}

export interface PrismaConnection {
  get prismaClient(): PrismaClient;
}

@sequencerModule()
export class PrismaDatabaseConnection
  extends SequencerModule<PrismaDatabaseConfig>
  implements PrismaConnection
{
  public constructor(private readonly tracer: Tracer) {
    super();
  }

  private initializedClient: PrismaClient | undefined = undefined;

  public get prismaClient(): PrismaClient {
    if (this.initializedClient === undefined) {
      throw new Error("Client not initialized yet, wait for after the startup");
    }
    return this.initializedClient;
  }

  public static dependencies(): OmitKeys<
    StorageDependencyMinimumDependencies<{
      readonly prisma: PrismaDatabaseConnection;
    }>,
    "blockTreeStore" | "asyncTreeStore" | "unprovenTreeStore"
  > {
    return {
      asyncStateService: {
        useGenerated: (service) =>
          new PrismaStateService(
            service.prisma,
            service.prisma.tracer,
            "batch"
          ),
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
        useGenerated: (service) =>
          new PrismaStateService(
            service.prisma,
            service.prisma.tracer,
            "block"
          ),
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
      propertyStorage: {
        useClass: PrismaPropertyStorage,
      },

      asyncLinkedLeafStore: {
        useGenerated: (module) => {
          return new PrismaLinkedLeafStore(
            module.prisma,
            module.prisma.tracer,
            "batch"
          );
        },
      },

      unprovenLinkedLeafStore: {
        useGenerated: (module) => {
          return new PrismaLinkedLeafStore(
            module.prisma,
            module.prisma.tracer,
            "block"
          );
        },
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
      "LinkedLeaf",
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
        log: this.config.log,
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
