import "reflect-metadata";
import { container } from "tsyringe";
import { Field, PrivateKey, PublicKey, UInt64 } from "snarkyjs";
import {
  Runtime,
  runtimeMethod,
  RuntimeModule,
  runtimeModule,
  state,
} from "@proto-kit/module";
import { Option, State, StateMap } from "@proto-kit/protocol";
import { Presets, log } from "@proto-kit/common";

import { Sequencer } from "./sequencer/executor/Sequencer";
import { PrivateMempool } from "./mempool/private/PrivateMempool";
import { GraphqlServer } from "./graphql/GraphqlServer";
import { GraphqlSequencerModule } from "./graphql/GraphqlSequencerModule";
import { MempoolResolver } from "./graphql/modules/MempoolResolver";
import { UnsignedTransaction } from "./mempool/PendingTransaction";
import { QueryGraphqlModule } from "./graphql/modules/QueryGraphqlModule";

log.setLevel(log.levels.INFO);

function createNewTx() {
  const pk = PrivateKey.random();

  const tx = new UnsignedTransaction({
    nonce: UInt64.zero,
    args: [Field(1)],
    methodId: Field(1),
    sender: pk.toPublicKey(),
  }).sign(pk);

  console.log(tx.toJSON());
}
createNewTx();

@runtimeModule()
export class Balances extends RuntimeModule<object> {
  /**
   * We use `satisfies` here in order to be able to access
   * presets by key in a type safe way.
   */
  public static presets = {} satisfies Presets<object>;

  @state() public balances = StateMap.from<PublicKey, UInt64>(
    PublicKey,
    UInt64
  );

  @runtimeMethod()
  public getBalance(address: PublicKey): Option<UInt64> {
    return this.balances.get(address);
  }

  @runtimeMethod()
  public setBalance(address: PublicKey, balance: UInt64) {
    this.balances.set(address, balance);
  }
}

const runtime = Runtime.from({
  modules: {
    Balances,
  },

  config: {
    Balances: {},
  },
});

const sequencerClass = Sequencer.from({
  modules: {
    Mempool: PrivateMempool,
    GraphqlServer,

    Graphql: GraphqlSequencerModule.from({
      modules: {
        MempoolResolver,
        QueryGraphqlModule,
      },

      config: {
        MempoolResolver: {},
        QueryGraphqlModule: {},
      },
    }),
  },
});
container.register("Runtime", { useClass: runtime });

const sequencer = new sequencerClass();
sequencer.create(() => container);

sequencer.configure({
  GraphqlServer: {
    port: 8080,
    host: "0.0.0.0",
  },

  Graphql: {},
  Mempool: {},
});

await sequencer.start();
