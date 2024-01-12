import {
  DependencyDeclaration,
  DependencyFactory,
  DependencyRecord,
} from "@proto-kit/common";
import { StateServiceProvider } from "@proto-kit/protocol";
import { MethodIdResolver } from "@proto-kit/module";

export interface SharedDependencyRecord extends DependencyRecord {
  stateServiceProvider: DependencyDeclaration<StateServiceProvider>;
  methodIdResolver: DependencyDeclaration<MethodIdResolver>;
}

export class SharedDependencyFactory implements DependencyFactory {
  public dependencies(): SharedDependencyRecord {
    return {
      stateServiceProvider: {
        useClass: StateServiceProvider,
      },
      methodIdResolver: {
        useClass: MethodIdResolver,
      },
    };
  }
}
