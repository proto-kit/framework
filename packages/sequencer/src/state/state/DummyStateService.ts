import { Field } from "o1js";
import { StateService } from "@proto-kit/protocol";
import { noop } from "@proto-kit/common";

export class DummyStateService implements StateService {
  public get(key: Field): Field[] | undefined {
    return undefined;
  }

  public set(key: Field, value: Field[] | undefined): void {
    noop();
  }
}
