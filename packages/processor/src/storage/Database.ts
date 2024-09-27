import { DependencyFactory, NoConfig, TypedClass } from "@proto-kit/common";
import { injectable } from "tsyringe";

import { ProcessorModule } from "../ProcessorModule";
import { BasePrismaClient } from "../handlers/BasePrismaClient";

import { BlockStorage } from "./BlockStorage";
import { PrismaDatabaseConnection } from "./PrismaDatabaseConnection";

@injectable()
export class Database<PrismaClient extends BasePrismaClient>
  extends ProcessorModule<NoConfig>
  implements PrismaDatabaseConnection<PrismaClient>, DependencyFactory
{
  public constructor(public prismaClient: PrismaClient) {
    super();
  }

  public static from<PrismaClient extends BasePrismaClient>(
    prismaClient: PrismaClient
  ): TypedClass<Database<PrismaClient>> {
    return class ScopedDatabase extends Database<PrismaClient> {
      public constructor() {
        super(prismaClient);
      }
    };
  }

  public dependencies() {
    return {
      BlockStorage: {
        useClass: BlockStorage,
      },
    };
  }

  public async start() {
    this.prismaClient.$connect();
  }
}
