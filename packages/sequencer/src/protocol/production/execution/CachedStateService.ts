import { InMemoryStateService } from "@yab/module";
import { Field } from "snarkyjs";
import { AsyncStateService } from "../state/AsyncStateService";

export class CachedStateService extends InMemoryStateService implements AsyncStateService {
  public constructor(private readonly parent: AsyncStateService) {
    super();
  }

  public async preloadKey(key: Field){
    // Only preload it if it hasn't been preloaded previously
    if(this.get(key) !== undefined){
      const value = await this.parent.getAsync(key);
      this.set(key, value);
    }
  }

  public async preloadKeys(keys: Field[]): Promise<void> {
    await Promise.all(
      keys.map(async (key) => {
        await this.preloadKey(key);
      })
    );
  }

  public async getAsync(key: Field): Promise<Field[] | undefined> {
    return this.get(key);
  }

  public async setAsync(key: Field, value: Field[] | undefined): Promise<void> {
    return this.set(key, value)
  }
}