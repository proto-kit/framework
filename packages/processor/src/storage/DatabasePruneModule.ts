import { inject, injectable } from "tsyringe";
import { log } from "@proto-kit/common";

import { BasePrismaClient } from "../handlers/BasePrismaClient";
import { ProcessorModule } from "../ProcessorModule";

import { Database } from "./Database";

export interface DatabasePruneModuleConfig {
  pruneOnStartup?: boolean;
}

@injectable()
export class DatabasePruneModule extends ProcessorModule<DatabasePruneModuleConfig> {
  public constructor(
    @inject("Database") private readonly database: Database<BasePrismaClient>
  ) {
    super();
  }

  public async start() {
    try {
      if (this.config?.pruneOnStartup ?? false) {
        log.info("Pruning database");
        await this.database.pruneDatabase();
      }
    } catch (e) {
      log.error(e);
    }
  }
}
