import { PublicKey } from "snarkyjs";

import { runtimeModule } from "../../src/module/decorator.js";
import { RuntimeModule } from "../../src/runtime/RuntimeModule.js";
import { method } from "../../src/method/decorator.js";
import { assert } from "../../src/method/assert.js";

interface AdminConfig {
  publicKey: string;
}

@runtimeModule()
export class Admin extends RuntimeModule<AdminConfig> {
  @method()
  public isAdmin(publicKey: PublicKey) {
    const admin = PublicKey.empty().toConstant();
    assert(admin.equals(publicKey));
  }
}
