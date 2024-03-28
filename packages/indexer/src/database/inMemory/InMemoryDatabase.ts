import { BlockStorage } from "../BlockStorage";
import { Database } from "../Database";
import { IndexerModule } from "../../IndexerModule";
import { DependencyFactory } from "@proto-kit/common";
import { InMemoryBlockStorage } from "./InMemoryBlockStorage";
import { injectable } from "tsyringe";

@injectable()
export class InMemoryDatabase
  extends IndexerModule<Record<never, never>>
  implements Database, DependencyFactory
{
  public dependencies() {
    return {
      BlockStorage: {
        useClass: InMemoryBlockStorage,
      },
    };
  }
}
