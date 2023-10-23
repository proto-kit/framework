import { PublicKey } from "o1js";

import { runtimeModule } from "../../src/module/decorator.js";
import { RuntimeModule } from "../../src/runtime/RuntimeModule.js";
import { runtimeMethod } from "../../src/method/runtimeMethod.js";
import { assert } from "@proto-kit/protocol";

interface AdminConfig {
  publicKey: string;
}

@runtimeModule()
export class Admin extends RuntimeModule<AdminConfig> {
  @runtimeMethod()
  public isAdmin(publicKey: PublicKey) {
    const admin = PublicKey.empty().toConstant();
    assert(admin.equals(publicKey));
  }
}
