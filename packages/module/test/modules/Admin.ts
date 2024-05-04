import { PublicKey } from "o1js";
import { assert } from "@proto-kit/protocol";

import { runtimeModule } from "../../src/module/decorator.js";
import { RuntimeModule } from "../../src/runtime/RuntimeModule.js";
import { runtimeMethod } from "../../src/method/runtimeMethod.js";

interface AdminConfig {
  publicKey: string;
}

@runtimeModule()
export class Admin extends RuntimeModule<AdminConfig> {
  @runtimeMethod()
  public async isAdmin(publicKey: PublicKey) {
    const admin = PublicKey.empty<typeof PublicKey>().toConstant();
    assert(admin.equals(publicKey));
  }
}
