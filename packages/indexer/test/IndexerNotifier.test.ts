import "reflect-metadata";
import { PrivateKey } from "o1js";
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
import { Protocol, assert } from "@proto-kit/protocol";
import {
  BlockStorageNetworkStateModule,
  InMemorySigner,
  InMemoryTransactionSender,
  StateServiceQueryModule,
  TestingAppChain,
} from "@proto-kit/sdk";
import { Sequencer } from "@proto-kit/sequencer";

import { IndexerNotifier } from "../src/IndexerNotifier";
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

function createAppChain() {
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
          IndexerNotifier: IndexerNotifier,
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

  return appChain;
}

async function sendTransactions(
  appChain: ReturnType<typeof createAppChain>,
  count: number
) {
  const senderPrivateKey = PrivateKey.random();
  const sender = senderPrivateKey.toPublicKey();
  const balances = appChain.runtime.resolve("Balances");

  appChain.setSigner(senderPrivateKey);

  for (let i = 0; i < count; i++) {
    const tx = await appChain.transaction(
      sender,
      async () => {
        await balances.mintSigned(TokenId.from(0), Balance.from(1000));
      },
      { nonce: i }
    );

    console.log("tx nonce", tx.transaction?.nonce.toBigInt());

    await tx.sign();
    await tx.send();
  }

  return await appChain.produceBlock();
}

describe("IndexerNotifier", () => {
  let appChain: ReturnType<typeof createAppChain>;

  beforeAll(async () => {
    appChain = createAppChain();

    await appChain.start();
  });

  it("should create a task for every unproven block produced", async () => {
    const block = await sendTransactions(appChain, 2);
    console.log("block", block?.transactions);
  });
});
