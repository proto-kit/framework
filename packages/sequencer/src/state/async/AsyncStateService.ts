import { Field } from "o1js";

/**
 * This Interface should be implemented for services that store the state
 * in an external storage (like a DB). This can be used in conjunction with
 * CachedStateService to preload keys for In-Circuit usage.
 */
export interface AsyncStateService {
  openTransaction: () => Promise<void>;

  commit: () => Promise<void>;

  // TODO Make sync, we have openTx and commit() for the actual writing operations
  setAsync: (key: Field, value: Field[] | undefined) => Promise<void>;

  getAsync: (key: Field) => Promise<Field[] | undefined>;
}
