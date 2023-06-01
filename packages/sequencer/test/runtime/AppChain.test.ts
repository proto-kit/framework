import {
  assert,
  InMemoryStateService,
  method,
  Runtime,
  RuntimeModule,
  runtimeModule
} from "@yab/module";
import { PublicKey } from "snarkyjs";
import { FlipOptional } from "@yab/protocol";
import { Sequencer } from "../../src/runtime/executor/Sequencer";
import { GraphQLServerModule } from "../../src/graphql/GraphqlSequencerModule";
import { AppChain } from "../../src/runtime/appchain/AppChain";

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

  public get defaultConfig(): FlipOptional<AdminConfig> {
    return {};
  }
}

describe("appchain", () => {
  it("should execute appchain correctly + compilation test", async () => {
    // eslint-disable-next-line no-warning-comments
    // TODO To be expanded once runtimemodules are connected with sequencer
    const appChain = AppChain.from({
      sequencer: Sequencer.from({
        graphql: GraphQLServerModule,
      }),

      runtime: Runtime.from({
        runtimeModules: {
          admin: Admin,
        },

        state: new InMemoryStateService(),
      }),
    });

    appChain.config({
      sequencer: {
        graphql: {
          port: 8080,
        },
      },

      runtime: {
        admin: {
          publicKey: "123",
        },
      },
    });

    await appChain.start();
  });
});
