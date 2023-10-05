import { Sequencer } from "./sequencer/executor/Sequencer";
import { PrivateMempool } from "./mempool/private/PrivateMempool";
import { GraphqlServer } from "./graphql/GraphqlServer";
import { GraphqlSequencerModule } from "./graphql/GraphqlSequencerModule";
import { MempoolResolver } from "./graphql/modules/MempoolResolver";
import { container } from "tsyringe";
import { log } from "@proto-kit/common";
import { UnsignedTransaction } from "./mempool/PendingTransaction";
import { Field, PrivateKey, UInt64 } from "snarkyjs";

log.setLevel(log.levels.INFO)

function createNewTx() {

  const pk = PrivateKey.random();

  const tx = new UnsignedTransaction({
    nonce: UInt64.zero,
    args: [Field(1)],
    methodId: Field(1),
    sender: pk.toPublicKey()
  }).sign(pk)

  console.log(tx.toJSON())
}
createNewTx();

const sequencerClass = Sequencer.from({
  modules: {
    Mempool: PrivateMempool,
    GraphqlServer,
    Graphql: GraphqlSequencerModule.from({
      modules: {
        MempoolResolver,
      },
      config: {
        MempoolResolver: {},
      },
    }),
  },
});
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