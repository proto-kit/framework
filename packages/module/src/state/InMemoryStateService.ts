import { Field } from "o1js";
import { StateService } from "@proto-kit/protocol";

/**
 * Naive implementation of a StateService for testing purposes
 */
export class InMemoryStateService implements StateService {
  public values: Record<string, Field[] | undefined> = {};

  public get(key: Field): Field[] | undefined {
    return this.values[key.toString()];
  }

  public set(key: Field, value: Field[] | undefined) {
    if (
      value === undefined &&
      Object.prototype.hasOwnProperty.call(this.values, key.toString())
    ) {
      delete this.values[key.toString()];
    } else {
      this.values[key.toString()] = value;
    }
  }
}
