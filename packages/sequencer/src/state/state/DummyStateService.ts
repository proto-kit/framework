import { Field } from "o1js";
import { SimpleAsyncStateService } from "@proto-kit/protocol";
import { noop } from "@proto-kit/common";

export class DummyStateService implements SimpleAsyncStateService {
  public async get(key: Field): Promise<Field[] | undefined> {
    return undefined;
  }

  public async set(key: Field, value: Field[] | undefined): Promise<void> {
    noop();
  }
}
