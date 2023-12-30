import { injectable } from "tsyringe";
import {
  AreProofsEnabled,
  DependencyFactory,
  DependencyRecord,
} from "@proto-kit/common";

@injectable()
export class InMemoryAreProofsEnabled implements AreProofsEnabled {
  private proofsEnabled = false;

  public get areProofsEnabled(): boolean {
    return this.proofsEnabled;
  }

  public setProofsEnabled(areProofsEnabled: boolean): void {
    this.proofsEnabled = areProofsEnabled;
  }
}

export class AreProofsEnabledFactory implements DependencyFactory {
  public dependencies() {
    return {
      areProofsEnabled: {
        useClass: InMemoryAreProofsEnabled,
      },
    } satisfies DependencyRecord;
  }
}
