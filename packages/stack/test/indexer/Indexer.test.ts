import "reflect-metadata";
import {
  BlockStorageNetworkStateModule,
  InMemorySigner,
  InMemoryTransactionSender,
  StateServiceQueryModule,
  TestingAppChain,
} from "@proto-kit/sdk";
import { Field, PrivateKey, Provable, Struct, UInt64, ZkProgram } from "o1js";
import {
  Balance,
  Balances,
  BalancesKey,
  InMemorySequencerModules,
  TokenId,
  VanillaProtocolModules,
  VanillaRuntimeModules,
} from "@proto-kit/library";
import { Runtime, runtimeMethod } from "@proto-kit/module";
import { Sequencer } from "@proto-kit/sequencer";
import { Protocol, assert } from "@proto-kit/protocol";
import {
  GraphqlSequencerModule,
  GraphqlServer,
  ExtendedUnprovenBlockResolver,
  TransactionResolver,
} from "@proto-kit/api";
import {
  IndexerNotifier,
  Indexer,
  SharedLocalTaskQueue,
  Worker,
  InMemoryDatabase,
} from "@proto-kit/indexer";
import { log } from "@proto-kit/common";

log.setLevel("DEBUG");

class TestBalances extends Balances {
  @runtimeMethod()
  public async mintSigned(tokenId: TokenId, amount: Balance) {
    const balance = (
      await this.balances.get(
        new BalancesKey({ tokenId, address: this.transaction.sender.value })
      )
    ).value;

    assert(tokenId.equals(0n), "only token 0 is supported");
    this.setBalance(
      tokenId,
      this.transaction.sender.value,
      balance.add(amount)
    );
  }
}

describe("indexer", () => {
  it("should index every block", async () => {
    const aliceKey = PrivateKey.random();
    const alice = aliceKey.toPublicKey();
    const bobKey = PrivateKey.random();
    const bob = bobKey.toPublicKey();

    const appChain = new TestingAppChain({
      Runtime: Runtime.from({
        modules: VanillaRuntimeModules.with({
          Balances: TestBalances,
        }),
      }),

      Protocol: Protocol.from({
        modules: VanillaProtocolModules.with({}),
      }),

      Sequencer: Sequencer.from({
        modules: InMemorySequencerModules.with(
          {
            IndexerNotifier,
          },
          {}
        ),
      }),

      modules: {
        Signer: InMemorySigner,
        TransactionSender: InMemoryTransactionSender,
        QueryTransportModule: StateServiceQueryModule,
        NetworkStateTransportModule: BlockStorageNetworkStateModule,
      },
    });

    appChain.configurePartial({
      Runtime: {
        Balances: {},
      },
      Protocol: {
        AccountState: {},
        BlockProver: {},
        StateTransitionProver: {},
        BlockHeight: {},
        LastStateRoot: {},
        TransactionFee: {
          tokenId: 0n,
          feeRecipient: PrivateKey.random().toPublicKey().toBase58(),
          baseFee: 0n,
          perWeightUnitFee: 0n,
          methods: {},
        },
      },
      Sequencer: {
        Database: {},
        BlockTrigger: {},
        Mempool: {},
        BlockProducerModule: {},
        LocalTaskWorkerModule: {
          StateTransitionReductionTask: {},
          StateTransitionTask: {},
          RuntimeProvingTask: {},
          BlockBuildingTask: {},
          BlockProvingTask: {},
          BlockReductionTask: {},
        },
        BaseLayer: {},
        UnprovenProducerModule: {},
        TaskQueue: {
          simulatedDuration: 0,
        },
        IndexerNotifier: {},
      },
      Signer: {
        signer: PrivateKey.random(),
      },
      TransactionSender: {},
      QueryTransportModule: {},
      NetworkStateTransportModule: {},
    });

    await appChain.start();

    const indexer = new Indexer({
      modules: {
        Database: InMemoryDatabase,
        TaskQueue: SharedLocalTaskQueue,
        Worker: Worker,
        GraphqlServer: GraphqlServer,
        Graphql: GraphqlSequencerModule.from({
          modules: {
            ExtendedUnprovenBlockResolver,
            TransactionResolver,
          },
        }),
      },
    });

    indexer.configure({
      Database: {},
      TaskQueue: {},
      Worker: {},
      GraphqlServer: {
        port: 8080,
        host: "0.0.0.0",
        graphiql: true,
      },
      Graphql: {
        ExtendedUnprovenBlockResolver: {},
        TransactionResolver: {},
      },
    });

    // dont forget to initialize worker later
    await indexer.start();

    const taskQueue = appChain.sequencer.resolve("TaskQueue");
    indexer.taskQueue.shareQueueWith(taskQueue);

    // queue has been initialized, worker can be started
    await indexer.resolve("Worker").initialize();

    const balances = appChain.runtime.resolve("Balances");
    const tokenId = TokenId.from(0);

    for (let i = 0; i < 100; i++) {
      const isEven = i % 2 === 0;
      const txTokenId = isEven ? tokenId : TokenId.from(1);
      appChain.setSigner(isEven ? aliceKey : bobKey);
      const tx = await appChain.transaction(isEven ? alice : bob, async () => {
        await balances.mintSigned(txTokenId, Balance.from(100));
      });

      await tx.sign();
      await tx.send();

      console.log("sent tx", { nonce: i, tokenId: txTokenId.toString() });
      const block = await appChain.produceBlock();

      Provable.log("produced block", i, block);
      await new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });
    }

    await new Promise((resolve) => {});
  }, 1_000_000_000);
});
