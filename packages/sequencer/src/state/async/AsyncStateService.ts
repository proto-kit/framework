import { Field } from "o1js";

export interface StateEntry {
  key: Field;
  value: Field[] | undefined;
}

/**
 * This Interface should be implemented for services that store the state
 * in an external storage (like a DB). This can be used in conjunction with
 * CachedStateService to preload keys for In-Circuit usage.
 */
export interface AsyncStateService {
  openTransaction: () => Promise<void>;

  commit: () => Promise<void>;

  writeStates: (entries: StateEntry[]) => void;

  getAsync: (keys: Field[]) => Promise<StateEntry[]>;

  getSingleAsync: (key: Field) => Promise<Field[] | undefined>;
}
