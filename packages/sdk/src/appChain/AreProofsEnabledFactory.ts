import { injectable } from "tsyringe";
import {
  AreProofsEnabled,
  dependency,
  dependencyFactory,
  DependencyFactory,
} from "@proto-kit/common";

@injectable()
export class AreProofsEnabledImpl implements AreProofsEnabled {
  private proofsEnabled = false;

  public get areProofsEnabled(): boolean {
    return this.proofsEnabled;
  }

  public setProofsEnabled(areProofsEnabled: boolean): void {
    this.proofsEnabled = areProofsEnabled;
  }
}

@dependencyFactory()
export class AreProofsEnabledFactory extends DependencyFactory {
  @dependency()
  public areProofsEnabled(): AreProofsEnabled {
    return new AreProofsEnabledImpl();
  }
}
