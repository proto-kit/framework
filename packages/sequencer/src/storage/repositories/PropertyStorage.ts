/**
 * Interface for permanentely storing properties that are computed at
 * runtime which  we don't want to configure statically but need to
 * save for further use.
 *
 * Currently unused, but might later be used for storage of for example
 * deployed contract's addresses, sequencer nonces, etc.
 */
export interface PropertyStorage {
  set: (key: string, value: string) => Promise<void>;
  get: (key: string) => Promise<string | undefined>;
}
