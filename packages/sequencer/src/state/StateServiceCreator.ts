import { AsyncStateService } from "./async/AsyncStateService";
import { CachedStateService } from "./state/CachedStateService";

export interface StateServiceCreator {
  createMask(name: string, parent: string): Promise<AsyncStateService>;
  getMask(name: string): Promise<AsyncStateService>;
  mergeIntoParent(name: string): Promise<void>;
}

export class InMemoryMasker<
  T extends {
    createMask(name: string): Promise<T>;
    mergeIntoParent(): Promise<void>;
    name?: string;
  },
> {
  public constructor(base: T) {
    this.serviceStack = [base];
  }

  private serviceStack: T[];

  private findService(name: string) {
    if (name === "latest") {
      return this.serviceStack.at(-1)!;
    }
    return this.serviceStack.find((service) => service.name === name);
  }

  public async getMask(name: string) {
    const candidate = this.findService(name);
    if (candidate === undefined) {
      throw new Error(`State service ${name} not found`);
    }
    return candidate;
  }

  public async createMask(name: string, parentName: string): Promise<T> {
    const candidate = this.findService(name);
    if (candidate !== undefined) {
      return candidate;
    }
    const parent = this.findService(parentName);
    if (parent === undefined) {
      throw new Error(`State service ${parentName} not found`);
    }
    const mask = await parent.createMask(name);
    this.serviceStack.push(mask);
    return mask;
  }

  public async mergeIntoParent(name: string): Promise<void> {
    const service = await this.getMask(name);

    await service.mergeIntoParent();

    const index = this.serviceStack.indexOf(service);
    if (index === -1) {
      throw new Error(
        "Service not found in stack although found earlier, this shouldn't happen"
      );
    }
    this.serviceStack.splice(index, 1);
  }
}

export class InMemoryStateServiceCreator
  extends InMemoryMasker<CachedStateService>
  implements StateServiceCreator
{
  public constructor() {
    super(new CachedStateService(undefined, "base"));
  }
}

// export class InMemoryTreeStoreCreator
//   export InMemoryMasker<CachedMerkleTreeStore>
