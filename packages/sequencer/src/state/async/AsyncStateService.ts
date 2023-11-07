import { Field } from "o1js";

/**
 * This Interface should be implemented for services that store the state
 * in an external storage (like a DB). This can be used in conjunction with
 * CachedStateService to preload keys for In-Circuit usage.
 */
export interface AsyncStateService {
  openTransaction: () => void;

  commit: () => void;

  setAsync: (key: Field, value: Field[] | undefined) => Promise<void>;

  getAsync: (key: Field) => Promise<Field[] | undefined>;
}
