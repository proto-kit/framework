import { injectable, Lifecycle, scoped } from "tsyringe";

import { MinimalVKTreeService } from "../accummulators/RuntimeVerificationKeyTree";

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class RuntimeVerificationKeyRootService implements MinimalVKTreeService {
  private injectedRoot?: bigint;

  public setRoot(root: bigint) {
    this.injectedRoot = root;
  }

  public getRoot() {
    if (this.injectedRoot === undefined) {
      throw new Error("VKTree root not set");
    }
    return this.injectedRoot;
  }
}
