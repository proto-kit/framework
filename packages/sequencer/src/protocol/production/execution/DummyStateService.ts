import { StateService } from "@yab/module";
import { Field } from "snarkyjs";
import { noop } from "@yab/protocol";

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
