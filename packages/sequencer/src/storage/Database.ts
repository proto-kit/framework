import { Closeable } from "../sequencer/builder/Closeable";

import { StorageDependencyFactory } from "./StorageDependencyFactory";

export interface Database extends StorageDependencyFactory, Closeable {
  /**
   * Prunes all data from the database connection.
   * Note: This function should only be called immediately at startup,
   * everything else will lead to unexpected behaviour and errors
   */
  pruneDatabase(): Promise<void>;
}
