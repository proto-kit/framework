import { InMemoryStateService } from "@proto-kit/module";
import { Field } from "o1js";
import { StateService } from "@proto-kit/protocol";

const errors = {
  parentIsUndefined: () => new Error("Parent StateService is undefined"),
};

export class SyncCachedStateService
  extends InMemoryStateService
  implements StateService
{
  public constructor(private readonly parent: StateService | undefined) {
    super();
  }

  public get(key: Field): Field[] | undefined {
    return super.get(key) ?? this.parent?.get(key);
  }

  private assertParentNotNull(
    parent: StateService | undefined
  ): asserts parent is StateService {
    if (parent === undefined) {
      throw errors.parentIsUndefined();
    }
  }

  /**
   * Merges all caches set() operation into the parent and
   * resets this instance to the parent's state (by clearing the cache and
   * defaulting to the parent)
   */
  public async mergeIntoParent() {
    const { parent, values } = this;
    this.assertParentNotNull(parent);

    // Set all cached values on parent
    Object.entries(values).forEach((value) => {
      parent.set(Field(value[0]), value[1] ?? undefined);
    });
    // Clear cache
    this.values = {};
  }
}
