import "reflect-metadata";
import { Field, PrivateKey } from "o1js";
import { Runtime } from "@proto-kit/module";
import {
  BlockStorageNetworkStateModule,
  ClientAppChain,
  InMemoryBlockExplorer,
  InMemorySigner,
  InMemoryTransactionSender,
  StateServiceQueryModule,
} from "@proto-kit/sdk";
import {
  BlockProverPublicInput,
  ContractArgsRegistry,
  ProvableNetworkState,
  Protocol,
  SettlementContractModule,
} from "@proto-kit/protocol";
import { UInt64, VanillaProtocolModules } from "@proto-kit/library";
import {
  expectDefined,
  LinkedMerkleTree,
  mapSequential,
} from "@proto-kit/common";
import { container } from "tsyringe";
import { afterAll } from "@jest/globals";

import { createTransaction } from "../integration/utils";
import { testingSequencerModules } from "../TestingSequencer";
import {
  BlockQueue,
  InMemoryMinaSigner,
  ManualBlockTrigger,
  MinaBaseLayer,
  MinaBaseLayerConfig,
  MinaNetworkUtils,
  PendingTransaction,
  PrivateMempool,
  Sequencer,
  SettlementModule,
  SettlementProvingTask,
  VanillaTaskWorkerModules,
} from "../../src";

import { Withdrawals } from "./mocks/Withdrawals";
import { Balances } from "./mocks/Balances";

// Most of this code is copied from test/Settlement.ts and thinned down to
// settlement-only - eventually we should consolidate and/or make the API nicer
// to require less code
export const settlementOnlyTestFn = (
  settlementType: "signed" | "mock-proofs" | "proven",
  baseLayerConfig: MinaBaseLayerConfig,
  timeout: number = 120_000
) => {
  let testAccounts: PrivateKey[] = [];

  const sequencerKey = PrivateKey.random();
  const settlementKey = PrivateKey.random();

  let trigger: ManualBlockTrigger;
  let settlementModule: SettlementModule;
  let blockQueue: BlockQueue;

  function setupAppChain() {
    const runtime = Runtime.from({
      Balances,
      Withdrawals,
    });

    // eslint-disable-next-line @typescript-eslint/dot-notation
    MinaBaseLayer.prototype["isSignedSettlement"] = () =>
      settlementType === "signed";

    const sequencer = Sequencer.from(
      testingSequencerModules(
        {
          BaseLayer: MinaBaseLayer,
          SettlementModule: SettlementModule,
          SettlementSigner: InMemoryMinaSigner,
        },
        {
          SettlementProvingTask,
        }
      )
    );

    const appchain = ClientAppChain.from({
      Runtime: runtime,
      Sequencer: sequencer,

      Protocol: Protocol.from({
        ...VanillaProtocolModules.mandatoryModules({}),
        SettlementContractModule: SettlementContractModule.from({
          ...SettlementContractModule.settlementOnly(),
        }),
      }),

      Signer: InMemorySigner,
      TransactionSender: InMemoryTransactionSender,
      QueryTransportModule: StateServiceQueryModule,
      NetworkStateTransportModule: BlockStorageNetworkStateModule,
      BlockExplorerTransportModule: InMemoryBlockExplorer,
    });

    appchain.configure({
      Runtime: {
        Balances: {
          totalSupply: UInt64.from(1000),
        },
        Withdrawals: {},
      },

      Sequencer: {
        Database: {},
        BlockTrigger: {},
        Mempool: {},
        BatchProducerModule: {},
        LocalTaskWorkerModule: {
          ...VanillaTaskWorkerModules.defaultConfig(),
        },
        BaseLayer: baseLayerConfig,
        SettlementSigner: {
          feepayer: sequencerKey,
          contractKeys: [settlementKey],
        },
        BlockProducerModule: {},
        FeeStrategy: {},
        SettlementModule: {},
        SequencerStartupModule: {},

        TaskQueue: {
          simulatedDuration: 0,
        },
      },
      Protocol: {
        ...Protocol.defaultConfig(),
        SettlementContractModule: {
          SettlementContract: {},
        },
      },
      TransactionSender: {},
      QueryTransportModule: {},
      Signer: {
        signer: sequencerKey,
      },
      NetworkStateTransportModule: {},
      BlockExplorerTransportModule: {},
    });

    return appchain;
  }

  let appChain: ReturnType<typeof setupAppChain>;

  async function createBatch(
    withTransactions: boolean,
    customNonce: number = 0,
    // Why is it like this?
    txs: PendingTransaction[] = []
  ) {
    const mempool = appChain.sequencer.resolve("Mempool") as PrivateMempool;
    if (withTransactions) {
      const key = testAccounts[0];
      const tx = createTransaction({
        runtime: appChain.runtime,
        method: ["Balances", "mint"],
        privateKey: key,
        args: [Field(1), key.toPublicKey(), UInt64.from(1e9 * 100)],
        nonce: customNonce,
      });

      await mempool.add(tx);
    }
    await mapSequential(txs, async (tx) => {
      await mempool.add(tx);
    });

    const result = await trigger.produceBlockAndBatch();
    const [block] = result;

    console.log(
      `block ${block?.height.toString()} ${block?.fromMessagesHash.toString()} -> ${block?.toMessagesHash.toString()}`
    );

    return result;
  }

  beforeAll(async () => {
    appChain = setupAppChain();

    await appChain.start(
      settlementType === "proven",
      container.createChildContainer()
    );

    settlementModule = appChain.sequencer.resolve(
      "SettlementModule"
    ) as SettlementModule;
    trigger =
      appChain.sequencer.dependencyContainer.resolve<ManualBlockTrigger>(
        "BlockTrigger"
      );
    blockQueue = appChain.sequencer.resolve("BlockQueue") as BlockQueue;

    const networkUtils =
      appChain.sequencer.dependencyContainer.resolve<MinaNetworkUtils>(
        "NetworkUtils"
      );
    const accs = await networkUtils.getFundedAccounts(3);
    testAccounts = accs.slice(1);

    await networkUtils.waitForNetwork();

    console.log(
      `Funding ${sequencerKey.toPublicKey().toBase58()} from ${accs[0].toPublicKey().toBase58()}`
    );

    await networkUtils.faucet(sequencerKey.toPublicKey(), 20 * 1e9);
  }, timeout * 3);

  afterAll(async () => {
    container.resolve(ContractArgsRegistry).resetArgs("SettlementContract");

    await appChain.close();
  });

  let nonceCounter = 0;

  it("should throw error", async () => {
    await expect(settlementModule.checkDeployment()).rejects.toThrow();
  });

  it(
    "should deploy settlement contracts",
    async () => {
      // Deploy contract
      await settlementModule.deploy(
        {
          settlementContract: settlementKey.toPublicKey(),
        },
        {
          nonce: nonceCounter,
        }
      );

      nonceCounter += 1;

      console.log("Deployed");
    },
    timeout
  );

  it(
    "should settle",
    async () => {
      try {
        const [, batch] = await createBatch(true);

        const input = BlockProverPublicInput.fromFields(
          batch!.proof.publicInput.map((x) => Field(x))
        );
        expect(input.stateRoot.toString()).toStrictEqual(
          LinkedMerkleTree.EMPTY_ROOT.toString()
        );

        const lastBlock = await blockQueue.getLatestBlockAndResult();

        await trigger.settle(batch!, {});
        nonceCounter++;

        // TODO Check Smartcontract tx layout (call to dispatch with good preconditions, etc)

        console.log("Block settled");

        await settlementModule.utils.fetchContractAccounts({
          address: settlementModule.getSettlementContractAddress(),
        });
        const settlement = settlementModule.getSettlementContract();

        const afterNetworkState = new ProvableNetworkState(
          ProvableNetworkState.fromJSON(lastBlock!.result?.afterNetworkState!)
        );
        expectDefined(lastBlock);
        expectDefined(lastBlock.result);
        expect(settlement.networkStateHash.get().toString()).toStrictEqual(
          afterNetworkState.hash().toString()
        );
        expect(settlement.stateRoot.get().toString()).toStrictEqual(
          lastBlock!.result.stateRoot.toString()
        );
        expect(settlement.blockHashRoot.get().toString()).toStrictEqual(
          lastBlock!.result.blockHashRoot.toString()
        );
      } catch (e) {
        console.error(e);
        throw e;
      }
    },
    timeout
  );

  it("should not throw error after settlement", async () => {
    expect.assertions(1);

    await expect(settlementModule.checkDeployment()).resolves.toBeUndefined();
  });
};
