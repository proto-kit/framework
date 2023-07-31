import { InMemoryStateService } from "@yab/module";
import { Field } from "snarkyjs";

export class PreFilledStateService extends InMemoryStateService {
  public constructor(values: { [key: string]: Field[] | undefined }) {
    super();
    this.values = values;
  }
}
