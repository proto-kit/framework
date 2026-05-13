import { PropertyStorage } from "../repositories/PropertyStorage";

export class InMemoryPropertyStorage implements PropertyStorage {
  private readonly store: Record<string, string> = {};

  public async get(key: string): Promise<string | undefined> {
    return this.store[key];
  }

  public async set(key: string, value: string): Promise<void> {
    this.store[key] = value;
  }
}
