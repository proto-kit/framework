import { Field } from "o1js";
import { log, noop } from "@proto-kit/common";
import { InMemoryStateService } from "@proto-kit/module";

import { AsyncStateService, StateEntry } from "../async/AsyncStateService";

const errors = {
  parentIsUndefined: () => new Error("Parent StateService is undefined"),
};

export class CachedStateService
  extends InMemoryStateService
  implements AsyncStateService
{
  public constructor(private readonly parent: AsyncStateService | undefined) {
    super();
  }

  public get(key: Field): Field[] | undefined {
    return super.get(key);
  }

  private assertParentNotNull(
    parent: AsyncStateService | undefined
  ): asserts parent is AsyncStateService {
    if (parent === undefined) {
      throw errors.parentIsUndefined();
    }
  }

  public writeStates(entries: StateEntry[]): void {
    entries.forEach(({ key, value }) => {
      this.set(key, value);
    });
  }

  public async commit(): Promise<void> {
    noop();
  }

  public async openTransaction(): Promise<void> {
    noop();
  }

  public async preloadKey(key: Field) {
    await this.preloadKeys([key]);
  }

  public async preloadKeys(keys: Field[]): Promise<void> {
    if (this.parent !== undefined) {
      // Only preload it if it hasn't been preloaded previously
      // TODO Not safe for deletes
      const keysToBeLoaded = keys.filter((key) => this.get(key) === undefined);
      const loaded = await this.parent.getAsync(keysToBeLoaded);

      log.trace(
        `Preloaded: ${loaded.map(
          ({ key, value }) => `${key}: ${value?.map((x) => x.toString()) ?? []}`
        )}`
      );

      loaded.forEach(({ key, value }) => {
        this.set(key, value);
      });
    }
  }

  public async getAsync(keys: Field[]): Promise<StateEntry[]> {
    const remoteKeys: Field[] = [];

    const local: StateEntry[] = [];

    keys.forEach((key) => {
      const localValue = this.get(key);
      // TODO Not safe for deletes
      if (localValue !== undefined) {
        local.push({ key, value: localValue });
      } else {
        remoteKeys.push(key);
      }
    });

    const remote = await this.parent?.getAsync(remoteKeys);

    return local.concat(remote ?? []);
  }

  public async getSingleAsync(key: Field): Promise<Field[] | undefined> {
    const entries = await this.getAsync([key]);
    return entries.at(0)?.value;
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
    await parent.openTransaction();

    const writes = Object.entries(values).map(([key, value]) => ({
      key: Field(key),
      value,
    }));
    parent.writeStates(writes);

    await parent.commit();
    // Clear cache
    this.values = {};
  }
}
