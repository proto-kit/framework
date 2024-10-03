import { inject, injectable } from "tsyringe";
import { ProcessorModule } from "./../ProcessorModule";
import { Database } from "./Database";
import { BasePrismaClient } from "../handlers/BasePrismaClient";
import { log } from "@proto-kit/common";

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
