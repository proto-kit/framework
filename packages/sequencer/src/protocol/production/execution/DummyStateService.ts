import { StateService } from "@yab/module";
import { Field } from "snarkyjs";

export class DummyStateService implements StateService {
  public get(key: Field): Field[] | undefined {
    return undefined;
  }

  public set(key: Field, value: Field[] | undefined): void {}
}
