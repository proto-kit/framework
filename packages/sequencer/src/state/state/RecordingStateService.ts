import { InMemoryStateService } from "@proto-kit/module";
import { SimpleAsyncStateService } from "@proto-kit/protocol";
import { Field } from "o1js";
import { mapSequential } from "@proto-kit/common";

/**
 * A simple stateservice that records the retrieved and written state.
 * The values fields from the extended InMemoryStateService serves as the memory.
 * After merging, the memory will not be deleted.
 * Therefore, this service should not be used twice, except consectively
 */
export class RecordingStateService
  extends InMemoryStateService
  implements SimpleAsyncStateService
{
  public constructor(private readonly parent: SimpleAsyncStateService) {
    super();
  }

  /**
   * Works like get(), but if a value is in this store,
   * but is known to be empty, this will return null
   */
  protected getNullAware(key: Field): Field[] | null | undefined {
    return this.values[key.toString()];
  }

  public async get(key: Field): Promise<Field[] | undefined> {
    const remembered = this.getNullAware(key);
    if (remembered !== undefined) {
      return remembered ?? undefined;
    }
    const fetched = await this.parent.get(key);
    if (fetched !== undefined) {
      await super.set(key, fetched);
    }
    return fetched;
  }

  public async set(key: Field, value: Field[] | undefined): Promise<void> {
    await super.set(key, value);
  }

  public getRecorded() {
    return this.values;
  }

  public async mergeIntoParent() {
    await mapSequential(Object.entries(this.values), async ([key, values]) => {
      await this.parent.set(Field(key), values ?? undefined);
    });
  }
}
