import { Field } from "o1js";
import { StateService } from "@proto-kit/protocol";

/**
 * Naive implementation of an in-memory variant of the StateService interface
 */
export class InMemoryStateService implements StateService {
  /**
   * This mapping container null values if the specific entry has been deleted.
   * This is used by the CachedState service to keep track of deletions
   */
  public values: Record<string, Field[] | null> = {};

  public get(key: Field): Field[] | undefined {
    return this.values[key.toString()] ?? undefined;
  }

  public set(key: Field, value: Field[] | undefined) {
    if (value === undefined) {
      this.values[key.toString()] = null;
    } else {
      this.values[key.toString()] = value;
    }
  }
}
