import { Field } from "o1js";
import { StateService } from "@proto-kit/protocol";
import { noop } from "@proto-kit/common";

export class DummyStateService implements StateService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public get(key: Field): Field[] | undefined {
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public set(key: Field, value: Field[] | undefined): void {
    noop();
  }
}
