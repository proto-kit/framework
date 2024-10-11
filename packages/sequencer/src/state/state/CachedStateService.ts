import { Field } from "o1js";
import { log, noop, mapSequential } from "@proto-kit/common";
import { InMemoryStateService } from "@proto-kit/module";
import { SimpleAsyncStateService, StateTransition } from "@proto-kit/protocol";

import { AsyncStateService, StateEntry } from "../async/AsyncStateService";

const errors = {
  parentIsUndefined: () => new Error("Parent StateService is undefined"),
};

export class CachedStateService
  extends InMemoryStateService
  implements AsyncStateService, SimpleAsyncStateService
{
  private writes: StateEntry[] = [];

  public constructor(private readonly parent: AsyncStateService | undefined) {
    super();
  }

  /**
   * Works like get(), but if a value is in this store,
   * but is known to be empty, this will return null
   */
  private getNullAware(key: Field): Field[] | null | undefined {
    return this.values[key.toString()];
  }

  private assertParentNotNull(
    parent: AsyncStateService | undefined
  ): asserts parent is AsyncStateService {
    if (parent === undefined) {
      throw errors.parentIsUndefined();
    }
  }

  public writeStates(entries: StateEntry[]): void {
    this.writes.push(...entries);
  }

  public async commit(): Promise<void> {
    await mapSequential(this.writes, async ({ key, value }) => {
      await this.set(key, value);
    });
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
      const loaded = await this.parent.getMany(keysToBeLoaded);

      log.trace(
        `Preloaded: ${loaded.map(
          ({ key, value }) => `${key}: ${value?.map((x) => x.toString()) ?? []}`
        )}`
      );

      await mapSequential(loaded, async ({ key, value }) => {
        await this.set(key, value);
      });
    }
  }

  public async getMany(keys: Field[]): Promise<StateEntry[]> {
    const remoteKeys: Field[] = [];

    const local: StateEntry[] = [];

    keys.forEach((key) => {
      const localValue = this.getNullAware(key);
      if (localValue !== undefined) {
        local.push({ key, value: localValue ?? undefined });
      } else {
        remoteKeys.push(key);
      }
    });

    const remote = await this.parent?.getMany(remoteKeys);

    return local.concat(remote ?? []);
  }

  public async get(key: Field): Promise<Field[] | undefined> {
    const entries = await this.getMany([key]);
    return entries.at(0)?.value;
  }

  public async applyStateTransitions(
    stateTransitions: StateTransition<any>[]
  ): Promise<void> {
    // Use updated stateTransitions since only they will have the
    // right values
    const writes = stateTransitions
      .filter((st) => st.toValue.isSome.toBoolean())
      .map((st) => {
        return { key: st.path, value: st.toValue.toFields() };
      });
    this.writeStates(writes);
    await this.commit();
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
      value: value ?? undefined,
    }));
    parent.writeStates(writes);

    await parent.commit();
    // Clear cache
    this.values = {};
  }
}
