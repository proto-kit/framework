import { PrismaClient } from "@prisma/client";
import {
  sequencerModule,
  SequencerModule,
  StorageDependencyMinimumDependencies,
} from "@proto-kit/sequencer";
import { DependencyFactory, noop } from "@proto-kit/common";

import { PrismaStateService } from "./services/prisma/PrismaStateService";
import { PrismaBatchStore } from "./services/prisma/PrismaBatchStore";
import { PrismaBlockStorage } from "./services/prisma/PrismaBlockStorage";

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

@sequencerModule()
export class PrismaDatabaseConnection
  extends SequencerModule<PrismaDatabaseConfig>
  implements DependencyFactory
{
  private initializedClient: PrismaClient | undefined = undefined;

  public get client(): PrismaClient {
    if (this.initializedClient === undefined) {
      throw new Error("Client not initialized yet, wait for after the startup");
    }
    return this.initializedClient;
  }

  public dependencies(): Omit<
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
      }
    };
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
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
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
}
