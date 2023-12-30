import { PrismaClient } from "@prisma/client";
import {
  SequencerModule,
  StorageDependencyMinimumDependencies,
} from "@proto-kit/sequencer";
import { DependencyFactory, noop } from "@proto-kit/common";

import { PrismaStateService } from "./services/prisma/PrismaStateService";
import { PrismaBatchStore } from "./services/prisma/PrismaBatchStore";
import { PrismaBlockStorage } from "./services/prisma/PrismaBlockStorage";

export class PrismaDatabaseConnection
  extends SequencerModule
  implements DependencyFactory
{
  public readonly client = new PrismaClient();

  public dependencies(): Omit<
    StorageDependencyMinimumDependencies,
    "asyncMerkleStore" | "unprovenMerkleStore"
  > {
    return {
      asyncStateService: {
        useClass: PrismaStateService,
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
    };
  }

  public async start(): Promise<void> {
    noop();
  }
}
