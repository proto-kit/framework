/* eslint-disable no-inner-declarations */
import { log, mapSequential, RollupMerkleTree } from "@proto-kit/common";
import { VanillaProtocolModules } from "@proto-kit/library";
import { Runtime } from "@proto-kit/module";
import {
  BlockProverPublicInput,
  NetworkState,
  Protocol,
  ReturnType,
  SettlementContractModule,
} from "@proto-kit/protocol";
import {
  AppChain,
  BlockStorageNetworkStateModule,
  InMemorySigner,
  InMemoryTransactionSender,
  StateServiceQueryModule,
} from "@proto-kit/sdk";
import {
  AccountUpdate,
  Field,
  Mina,
  PrivateKey,
  UInt64,
  fetchAccount,
} from "o1js";
import "reflect-metadata";
import { container } from "tsyringe";

import {
  ManualBlockTrigger,
  PendingTransaction,
  PrivateMempool,
  BlockQueue,
  SettlementModule,
  MinaBaseLayer,
  WithdrawalQueue,
  SettlementProvingTask,
  MinaTransactionSender,
  MinaBaseLayerConfig,
} from "../../src";
import { BlockProofSerializer } from "../../src/protocol/production/helpers/BlockProofSerializer";
import { Balance } from "../integration/mocks/Balance";
import { Withdrawals } from "../integration/mocks/Withdrawals";
import { testingSequencerFromModules } from "../TestingSequencer";
import { createTransaction } from "../integration/utils";
import { MinaBlockchainAccounts } from "../../src/protocol/baselayer/accounts/MinaBlockchainAccounts";
import { FeeStrategy } from "../../src/protocol/baselayer/fees/FeeStrategy";

log.setLevel("INFO");

export const settlementTestFn = (
  settlementType: "signed" | "mock-proofs",
  baseLayerConfig: MinaBaseLayerConfig,
  timeout: number = 120_000
) => {
  // eslint-disable-next-line no-lone-blocks
  {
    let testAccounts: PrivateKey[] = [];

    const sequencerKey = PrivateKey.random();
    const settlementKey = PrivateKey.random();
    const dispatchKey = PrivateKey.random();
    let trigger: ManualBlockTrigger;
    let settlementModule: SettlementModule;
    let blockQueue: BlockQueue;

    let feeStrategy: FeeStrategy;

    let blockSerializer: BlockProofSerializer;

    function setupAppChain() {
      const runtime = Runtime.from({
        modules: {
          Balances: Balance,
          Withdrawals,
        },
      });

      // eslint-disable-next-line @typescript-eslint/dot-notation
      SettlementModule.prototype["isSignedSettlement"] = () =>
        settlementType === "signed";

      const sequencer = testingSequencerFromModules(
        {
          BaseLayer: MinaBaseLayer,
          SettlementModule: SettlementModule,
          OutgoingMessageQueue: WithdrawalQueue,
        },
        {
          SettlementProvingTask,
        }
      );

      const appchain = AppChain.from({
        Runtime: runtime,
        Sequencer: sequencer,

        Protocol: Protocol.from({
          modules: {
            ...VanillaProtocolModules.mandatoryModules({}),
            SettlementContractModule: SettlementContractModule.fromDefaults(),
          },
        }),

        modules: {
          Signer: InMemorySigner,
          TransactionSender: InMemoryTransactionSender,
          QueryTransportModule: StateServiceQueryModule,
          NetworkStateTransportModule: BlockStorageNetworkStateModule,
        },
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
          LocalTaskWorkerModule: {},
          OutgoingMessageQueue: {},
          BaseLayer: baseLayerConfig,
          BlockProducerModule: {},
          FeeStrategy: {},
          SettlementModule: {
            feepayer: sequencerKey,
          },
          ProtocolStartupModule: {},

          TaskQueue: {
            simulatedDuration: 0,
          },
        },
        Protocol: {
          StateTransitionProver: {},
          BlockHeight: {},
          AccountState: {},
          BlockProver: {},
          LastStateRoot: {},
          SettlementContractModule: {
            SettlementContract: {
              withdrawalStatePath: "Withdrawals.withdrawals",
              withdrawalMethodPath: "Withdrawals.withdraw",
            },
            DispatchContract: {
              incomingMessagesMethods: {
                deposit: "Balances.deposit",
              },
            },
          },
        },
        TransactionSender: {},
        QueryTransportModule: {},
        Signer: {
          signer: sequencerKey,
        },
        NetworkStateTransportModule: {},
      });

      return appchain;
    }

    let appChain: ReturnType<typeof setupAppChain>;

    async function createBatch(
      withTransactions: boolean,
      customNonce: number = 0,
      txs: PendingTransaction[] = []
    ) {
      const mempool = appChain.sequencer.resolve("Mempool") as PrivateMempool;
      if (withTransactions) {
        const key = testAccounts[0];
        const tx = createTransaction({
          runtime: appChain.runtime,
          method: ["Balances", "addBalance"],
          privateKey: key,
          args: [key.toPublicKey(), UInt64.from(1e9 * 100)],
          nonce: customNonce,
        });

        await mempool.add(tx);
      }
      await mapSequential(txs, async (tx) => {
        await mempool.add(tx);
      });

      const result = await trigger.produceBlockAndBatch();
      const [block, batch] = result;

      console.log(
        `block ${block?.height.toString()} ${block?.fromMessagesHash.toString()} -> ${block?.toMessagesHash.toString()}`
      );
      const proof = await blockSerializer
        .getBlockProofSerializer()
        .fromJSONProof(batch!.proof);
      console.log(
        `block ${proof.publicInput.incomingMessagesHash} -> ${proof.publicOutput.incomingMessagesHash}`
      );

      return result;
    }

    beforeAll(async () => {
      appChain = setupAppChain();

      await appChain.start(container.createChildContainer());

      settlementModule = appChain.sequencer.resolve(
        "SettlementModule"
      ) as SettlementModule;

      trigger =
        appChain.sequencer.dependencyContainer.resolve<ManualBlockTrigger>(
          "BlockTrigger"
        );
      blockQueue = appChain.sequencer.resolve("BlockQueue") as BlockQueue;
      feeStrategy = appChain.sequencer.resolve("FeeStrategy") as FeeStrategy;

      blockSerializer =
        appChain.sequencer.dependencyContainer.resolve(BlockProofSerializer);

      const accountService = appChain.sequencer.dependencyContainer.resolve(
        MinaBlockchainAccounts
      );
      const accs = await accountService.getFundedAccounts(3);
      testAccounts = accs.slice(1);

      console.log(
        `Funding ${sequencerKey.toPublicKey().toBase58()} from ${accs[0].toPublicKey().toBase58()}`
      );

      await accountService.fundAccountFrom(
        accs[0],
        sequencerKey.toPublicKey(),
        20 * 1e9
      );

      // const acc2 = await fetchAccount({ publicKey: accs[0].toPublicKey() });
    }, timeout);

    let nonceCounter = 0;
    let user0Nonce = 0;
    let acc0L2Nonce = 0;

    it(
      "should deploy",
      async () => {
        // Deploy contract
        await settlementModule.deploy(settlementKey, dispatchKey, {
          nonce: nonceCounter,
        });

        nonceCounter += 2;

        console.log("Deployed");
      },
      timeout
    );

    it(
      "should settle",
      async () => {
        const [, batch] = await createBatch(true);
        acc0L2Nonce++;

        const input = BlockProverPublicInput.fromFields(
          batch!.proof.publicInput.map((x) => Field(x))
        );
        expect(input.stateRoot.toBigInt()).toStrictEqual(
          RollupMerkleTree.EMPTY_ROOT
        );

        const lastBlock = await blockQueue.getLatestBlock();

        await trigger.settle(batch!);
        nonceCounter++;

        // TODO Check Smartcontract tx layout (call to dispatch with good preconditions, etc)

        console.log("Block settled");

        const { settlement } = settlementModule.getContracts();
        expect(settlement.networkStateHash.get().toBigInt()).toStrictEqual(
          lastBlock!.result.afterNetworkState.hash().toBigInt()
        );
        expect(settlement.stateRoot.get().toBigInt()).toStrictEqual(
          lastBlock!.result.stateRoot
        );
        expect(settlement.blockHashRoot.get().toBigInt()).toStrictEqual(
          lastBlock!.result.blockHashRoot
        );
      },
      timeout
    );

    it(
      "should include deposit",
      async () => {
        const { settlement, dispatch } = settlementModule.getContracts();

        const userKey = testAccounts[0];

        const contractBalanceBefore = settlement.account.balance.get();

        const tx = await Mina.transaction(
          {
            sender: userKey.toPublicKey(),
            fee: 0.01 * 1e9,
            nonce: user0Nonce++,
            memo: "deposit",
          },
          async () => {
            const au = AccountUpdate.createSigned(userKey.toPublicKey());
            au.balance.subInPlace(UInt64.from(100));
            await dispatch.deposit(UInt64.from(100));
          }
        );

        settlementModule.signTransaction(tx, [userKey]);

        await appChain.sequencer
          .resolveOrFail("TransactionSender", MinaTransactionSender)
          .proveAndSendTransaction(tx, "included");

        const actions = await Mina.fetchActions(dispatch.address);
        const balanceDiff = settlement.account.balance
          .get()
          .sub(contractBalanceBefore);

        expect(actions).toHaveLength(1);
        expect(balanceDiff.toBigInt()).toBe(100n);

        const [, batch] = await createBatch(false);

        console.log("Settling");

        await trigger.settle(batch!);
        nonceCounter++;

        const [, batch2] = await createBatch(false);

        const networkstateHash = Mina.activeInstance.getAccount(
          settlement.address
        );
        console.log("On-chain values");
        console.log(networkstateHash.zkapp!.appState.map((x) => x.toString()));

        console.log(
          `Empty Network State ${NetworkState.empty().hash().toString()}`
        );
        console.log(batch!.toNetworkState.hash().toString());
        console.log(batch2!.fromNetworkState.hash().toString());

        expect(batch!.toNetworkState.hash().toString()).toStrictEqual(
          batch2!.fromNetworkState.hash().toString()
        );

        expect(batch2!.blockHashes).toHaveLength(1);

        await trigger.settle(batch2!);
        nonceCounter++;

        const balance = await appChain.query.runtime.Balances.balances.get(
          userKey.toPublicKey()
        );

        expect(balance).toBeDefined();
      },
      timeout
    );

    it(
      "should process withdrawal",
      async () => {
        const { settlement } = settlementModule.getContracts();

        // Send mina to contract
        const usertx = await Mina.transaction(
          {
            sender: testAccounts[1].toPublicKey(),
            fee: feeStrategy.getFee(),
            memo: "fill bridging contract",
          },
          async () => {
            const au = AccountUpdate.createSigned(
              testAccounts[1].toPublicKey()
            );
            au.send({
              to: settlement.address,
              amount: UInt64.from(100 * 1e9),
            });
          }
        );
        settlementModule.signTransaction(usertx, [testAccounts[1]]);
        // await usertx.send();

        await appChain.sequencer
          .resolveOrFail("TransactionSender", MinaTransactionSender)
          .proveAndSendTransaction(usertx, "included");

        const userKey = testAccounts[0];

        const withdrawalTx = createTransaction({
          runtime: appChain.runtime,
          method: ["Withdrawals", "withdraw"],
          args: [userKey.toPublicKey(), UInt64.from(50 * 1e9)],
          nonce: acc0L2Nonce + 1,
          privateKey: userKey,
        });
        const [block, batch] = await createBatch(true, acc0L2Nonce, [
          withdrawalTx,
        ]);
        acc0L2Nonce += 2;

        console.log("Test netowrkstate");
        console.log(NetworkState.toJSON(block!.networkState.during));
        console.log(NetworkState.toJSON(batch!.toNetworkState));

        await trigger.settle(batch!);
        nonceCounter++;

        const txs = await settlementModule.sendRollupTransactions({
          nonce: nonceCounter++,
        });

        expect(txs).toHaveLength(1);

        if (baseLayerConfig.network.type !== "local") {
          await fetchAccount({
            publicKey: userKey.toPublicKey(),
            tokenId: settlement.deriveTokenId(),
          });
        }
        const account = Mina.getAccount(
          userKey.toPublicKey(),
          settlement.deriveTokenId()
        );

        expect(account.balance.toBigInt()).toStrictEqual(BigInt(1e9) * 49n);
      },
      timeout
    );

    it(
      "should be able to redeem withdrawal",
      async () => {
        const { settlement } = settlementModule.getContracts();

        const userKey = testAccounts[0];

        if (baseLayerConfig.network.type !== "local") {
          await fetchAccount({ publicKey: userKey.toPublicKey() });
        }
        const balanceBefore = Mina.getAccount(
          userKey.toPublicKey()
        ).balance.toBigInt();

        const amount = BigInt(1e9 * 49);

        const fee = feeStrategy.getFee();
        const tx = await Mina.transaction(
          {
            sender: userKey.toPublicKey(),
            nonce: user0Nonce++,
            fee,
            memo: "Redeem withdrawal",
          },
          async () => {
            const mintAU = AccountUpdate.create(userKey.toPublicKey());
            mintAU.balance.addInPlace(amount);
            // mintAU.requireSignature(); // TODO ?
            await settlement.redeem(mintAU);
          }
        );
        settlementModule.signTransaction(tx, [userKey]);
        await tx.prove();
        await tx.send().wait();

        if (baseLayerConfig.network.type !== "local") {
          await fetchAccount({ publicKey: userKey.toPublicKey() });
        }
        const balanceAfter = Mina.getAccount(
          userKey.toPublicKey()
        ).balance.toBigInt();

        expect(balanceAfter - balanceBefore).toBe(amount - BigInt(fee));
      },
      timeout
    );
  }
};
/* eslint-enable no-inner-declarations */
