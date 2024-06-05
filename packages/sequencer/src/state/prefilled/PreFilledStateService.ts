import { InMemoryStateService } from "@proto-kit/module";
import { Field } from "o1js";

export class PreFilledStateService extends InMemoryStateService {
  public constructor(values: { [key: string]: Field[] | null }) {
    super();
    this.values = values;
  }
}
