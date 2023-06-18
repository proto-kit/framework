import "reflect-metadata";
import { PublicKey } from "snarkyjs";
import {
  assert,
  InMemoryStateService,
  method,
  Runtime,
  RuntimeModule,
  runtimeModule,
} from "@yab/module";
import { Sequencer, sequencerModule, SequencerModule } from "@yab/sequencer";
import { inject } from "tsyringe";

import { AppChain } from "../../src";

interface AdminConfig {
  publicKey: string;
}

@runtimeModule()
class Admin extends RuntimeModule<AdminConfig> {
  @method()
  public isAdmin(publicKey: PublicKey) {
    const admin = PublicKey.fromBase58(this.config.publicKey);
    assert(admin.equals(publicKey));
  }
}

interface MempoolConfig {
  test: string;
}

@sequencerModule()
class Mempool extends SequencerModule<MempoolConfig> {
  public constructor(@inject("Runtime") public runtime: Runtime) {
    super();
  }

  public async start() {
    // for test purposes retrieve the configured runtime module and call it
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const admin = this.runtime.resolve("Admin") as unknown as Admin;

    admin.isAdmin(PublicKey.empty());
  }
}

describe("appChain", () => {
  it("should execute appchain correctly + compilation test", async () => {
    expect.assertions(0);

    const appChain = AppChain.from({
      runtime: Runtime.from({
        state: new InMemoryStateService(),

        modules: {
          Admin,
        },
      }),

      sequencer: Sequencer.from({
        modules: {
          Mempool,
        },
      }),
    });

    appChain.configure({
      runtime: {
        Admin: {
          publicKey: PublicKey.empty().toBase58(),
        },
      },

      sequencer: {
        Mempool: {
          test: "test",
        },
      },
    });

    await appChain.start();
  });
});
