import { Bool, PublicKey } from "snarkyjs";

import { runtimeModule } from "../../src/module/decorator.js";
import { RuntimeModule } from "../../src/runtime/RuntimeModule.js";
import { method } from "../../src/method/decorator.js";
import { assert } from "../../src/method/assert.js";
import { FlipOptional } from "@yab/protocol";

interface AdminConfig {
  publicKey: string;
}

@runtimeModule()
export class Admin extends RuntimeModule<AdminConfig> {
  @method()
  public isAdmin(publicKey: PublicKey) {
    let admin = PublicKey.fromBase58(this.config.publicKey).toConstant();
    assert(admin.equals(publicKey));
  }

  public get defaultConfig(): FlipOptional<AdminConfig> {
    return {};
  }
}
