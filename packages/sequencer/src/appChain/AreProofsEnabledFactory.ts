import { injectable } from "tsyringe";
import {
  AreProofsEnabled,
  dependencyFactory,
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

@dependencyFactory()
export class AreProofsEnabledFactory {
  public static dependencies() {
    return {
      areProofsEnabled: {
        useClass: InMemoryAreProofsEnabled,
      },
    } satisfies DependencyRecord;
  }
}
