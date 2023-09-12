import { Field } from "snarkyjs";
import { noop, StateService } from "@proto-kit/protocol";

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
