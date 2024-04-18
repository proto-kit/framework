import { Field } from "o1js";
import { StateService } from "@proto-kit/protocol";

/**
 * Naive implementation of a StateService for testing purposes
 */
export class InMemoryStateService implements StateService {
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
