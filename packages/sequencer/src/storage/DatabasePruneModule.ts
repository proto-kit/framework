import { inject } from "tsyringe";
import { noop, log } from "@proto-kit/common";

import {
  SequencerModule,
  sequencerModule,
} from "../sequencer/builder/SequencerModule";

import { Database } from "./Database";

export type DatabasePruneConfig = {
  pruneOnStartup?: boolean;
};

@sequencerModule()
export class DatabasePruneModule extends SequencerModule<DatabasePruneConfig> {
  public constructor(@inject("Database") private readonly database: Database) {
    super();
  }

  public async start() {
    try {
      if (this.config?.pruneOnStartup ?? false) {
        log.info("Pruning database");
        await this.database.pruneDatabase();
      }
    } catch (e) {
      noop();
    }
  }
}
