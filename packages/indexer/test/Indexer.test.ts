import "reflect-metadata";
import {
  BlockStorageNetworkStateModule,
  InMemorySigner,
  InMemoryTransactionSender,
  StateServiceQueryModule,
  TestingAppChain,
} from "@proto-kit/sdk";
import { PrivateKey } from "o1js";
import {
  Balance,
  Balances,
  InMemorySequencerModules,
  TokenId,
  VanillaProtocolModules,
  VanillaRuntimeModules,
} from "@proto-kit/library";
import { Runtime, runtimeMethod } from "@proto-kit/module";
import { Sequencer } from "@proto-kit/sequencer";
import { IndexerNotifier } from "../src/IndexerNotifier";
import { Protocol } from "@proto-kit/protocol";
import {
  Indexer,
  InMemoryDatabase,
  SharedLocalTaskQueue,
  Worker,
} from "../src";

class TestBalances extends Balances {
  @runtimeMethod()
  public mintSigned(tokenId: TokenId, amount: Balance) {
    const balance = this.getBalance(tokenId, this.transaction.sender.value);
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
        modules: InMemorySequencerModules.with({
          IndexerNotifier,
        }),
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
        LocalTaskWorkerModule: {},
        BaseLayer: {},
        UnprovenProducerModule: {},
        TaskQueue: {
          simulatedDuration: 0,
        },
        SettlementModule: {
          feepayer: PrivateKey.random(),
          address: PrivateKey.random().toPublicKey(),
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
      },
    });

    indexer.configure({
      Database: {},
      TaskQueue: {},
      Worker: {},
    });

    // dont forget to initialize worker later
    await indexer.start();

    const taskQueue = appChain.sequencer.resolve("TaskQueue");
    indexer.taskQueue.shareQueueWith(taskQueue);

    // queue has been initialized, worker can be started
    await indexer.resolve("Worker").initialize();

    const balances = appChain.runtime.resolve("Balances");
    const tokenId = TokenId.from(0);

    appChain.setSigner(aliceKey);
    const tx = await appChain.transaction(alice, () => {
      balances.mintSigned(tokenId, Balance.from(100));
    });

    await tx.sign();
    await tx.send();

    const block = await appChain.produceBlock();

    console.log("block produced", block);

    const done = new Promise<void>((resolve) => {
      setTimeout(async () => {
        const blockStorage = indexer.blockStorage;
        console.log("blockStorage", blockStorage);
        const block = await blockStorage.getBlockAt(0);
        console.log("block retrieved from indexer", block);
        resolve();
      }, 2000);
    });
    await done;
  });
});
