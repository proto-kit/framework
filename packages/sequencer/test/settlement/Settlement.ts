/* eslint-disable no-inner-declarations */
import {
  expectDefined,
  log,
  RollupMerkleTree,
  TypedClass,
  mapSequential,
} from "@proto-kit/common";
import { VanillaProtocolModules } from "@proto-kit/library";
import { Runtime } from "@proto-kit/module";
import {
  BlockProverPublicInput,
  BridgeContract,
  NetworkState,
  Protocol,
  ReturnType,
  SettlementContractModule,
  SettlementSmartContractBase,
  TokenBridgeAttestation,
  TokenBridgeTree,
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
  TokenId,
  SmartContract,
  UInt8,
  Bool,
} from "o1js";
import "reflect-metadata";
import { container } from "tsyringe";
import { FungibleToken, FungibleTokenAdmin } from "mina-fungible-token";

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
  SignedSettlementPermissions,
  ProvenSettlementPermissions,
} from "../../src";
import { BlockProofSerializer } from "../../src/protocol/production/helpers/BlockProofSerializer";
import { testingSequencerFromModules } from "../TestingSequencer";
import { createTransaction } from "../integration/utils";
import { MinaBlockchainAccounts } from "../../src/protocol/baselayer/accounts/MinaBlockchainAccounts";
import { FeeStrategy } from "../../src/protocol/baselayer/fees/FeeStrategy";
import { BridgingModule } from "../../src/settlement/BridgingModule";
import { SettlementUtils } from "../../src/settlement/utils/SettlementUtils";
import { FungibleTokenContractModule } from "../../src/settlement/utils/FungibleTokenContractModule";
import { FungibleTokenAdminContractModule } from "../../src/settlement/utils/FungibleTokenAdminContractModule";

import { Balances, BalancesKey } from "./mocks/Balances";
import { Withdrawals } from "./mocks/Withdrawals";

export const settlementTestFn = (
  settlementType: "signed" | "mock-proofs" | "proven",
  baseLayerConfig: MinaBaseLayerConfig,
  tokenConfig?: {
    tokenOwner: TypedClass<FungibleToken> & typeof SmartContract;
  },
  timeout: number = 120_000
) => {
  // eslint-disable-next-line no-lone-blocks
  {
    let testAccounts: PrivateKey[] = [];

    const sequencerKey = PrivateKey.random();
    const settlementKey = PrivateKey.random();
    const dispatchKey = PrivateKey.random();
    const minaBridgeKey = PrivateKey.random();
    // Only needed for tests with a custom token
    const tokenBridgeKey =
      tokenConfig === undefined ? minaBridgeKey : PrivateKey.random();
    const tokenOwnerKey = {
      tokenOwner: PrivateKey.random(),
      admin: PrivateKey.random(),
    };
    const tokenOwner =
      tokenConfig !== undefined
        ? // eslint-disable-next-line new-cap
          new tokenConfig.tokenOwner(tokenOwnerKey.tokenOwner.toPublicKey())
        : undefined;

    let trigger: ManualBlockTrigger;
    let settlementModule: SettlementModule;
    let bridgingModule: BridgingModule;
    let blockQueue: BlockQueue;

    let feeStrategy: FeeStrategy;

    let blockSerializer: BlockProofSerializer;

    const bridgedTokenId =
      tokenConfig === undefined ? TokenId.default : tokenOwner!.deriveTokenId();

    function setupAppChain() {
      const runtime = Runtime.from({
        modules: {
          Balances,
          Withdrawals,
        },
      });

      // eslint-disable-next-line @typescript-eslint/dot-notation
      SettlementUtils.prototype["isSignedSettlement"] = () =>
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
            SettlementContractModule: SettlementContractModule.with({
              FungibleToken: FungibleTokenContractModule,
              FungibleTokenAdmin: FungibleTokenAdminContractModule,
            }),
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
          SequencerStartupModule: {},

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
            SettlementContract: {},
            BridgeContract: {
              withdrawalStatePath: "Withdrawals.withdrawals",
              withdrawalEventName: "withdrawal",
            },
            DispatchContract: {
              incomingMessagesMethods: {
                deposit: "Balances.deposit",
              },
            },
            FungibleToken: {},
            FungibleTokenAdmin: {},
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
          method: ["Balances", "mint"],
          privateKey: key,
          args: [bridgedTokenId, key.toPublicKey(), UInt64.from(1e9 * 100)],
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
      log.setLevel("DEBUG");

      appChain = setupAppChain();

      await appChain.start(
        settlementType === "proven",
        container.createChildContainer()
      );

      settlementModule = appChain.sequencer.resolve(
        "SettlementModule"
      ) as SettlementModule;
      bridgingModule = appChain.sequencer.resolve(
        "BridgingModule"
      ) as BridgingModule;

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
    }, timeout);

    afterAll(() => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      SettlementSmartContractBase.args = undefined as any;
    });

    let nonceCounter = 0;
    let user0Nonce = 0;
    let acc0L2Nonce = 0;

    it(
      "should deploy",
      async () => {
        // Deploy contract
        await settlementModule.deploy(
          settlementKey,
          dispatchKey,
          minaBridgeKey,
          {
            nonce: nonceCounter,
          }
        );

        nonceCounter += 2;

        console.log("Deployed");
      },
      timeout * 2
    );

    if (tokenConfig !== undefined) {
      it(
        "should deploy custom token owner",
        async () => {
          const permissions =
            settlementType === "signed"
              ? new SignedSettlementPermissions()
              : new ProvenSettlementPermissions();

          const tx = await Mina.transaction(
            {
              sender: sequencerKey.toPublicKey(),
              memo: "Deploy custom token",
              nonce: nonceCounter++,
              fee: feeStrategy.getFee(),
            },
            async () => {
              AccountUpdate.fundNewAccount(sequencerKey.toPublicKey(), 2);

              const admin = new FungibleTokenAdmin(
                tokenOwnerKey.admin.toPublicKey()
              );
              await admin.deploy({
                verificationKey: undefined,
                adminPublicKey: sequencerKey.toPublicKey(),
              });
              admin.self.account.permissions.set(
                permissions.bridgeContractToken()
              );

              await tokenOwner!.deploy({
                verificationKey: undefined,
                src: "",
                symbol: "TEST",
              });
              tokenOwner!.self.account.permissions.set(
                permissions.bridgeContractToken()
              );
            }
          );
          console.log(tx.toPretty());

          settlementModule.utils.signTransaction(
            tx,
            [sequencerKey, tokenOwnerKey.tokenOwner, tokenOwnerKey.admin],
            [tokenOwnerKey.tokenOwner, tokenOwnerKey.admin]
          );

          await appChain.sequencer
            .resolveOrFail("TransactionSender", MinaTransactionSender)
            .proveAndSendTransaction(tx, "included");
        },
        timeout
      );

      it(
        "should initialize custom token",
        async () => {
          const tx = await Mina.transaction(
            {
              sender: sequencerKey.toPublicKey(),
              memo: "Initialized custom token owner",
              nonce: nonceCounter++,
              fee: feeStrategy.getFee(),
            },
            async () => {
              AccountUpdate.fundNewAccount(sequencerKey.toPublicKey(), 1);

              await tokenOwner!.initialize(
                tokenOwnerKey.admin.toPublicKey(),
                UInt8.from(9),
                Bool(false)
              );
            }
          );
          console.log(tx.toPretty());
          settlementModule.utils.signTransaction(
            tx,
            [sequencerKey, tokenOwnerKey.tokenOwner, tokenOwnerKey.admin],
            [tokenOwnerKey.tokenOwner, tokenOwnerKey.admin]
          );

          await appChain.sequencer
            .resolveOrFail("TransactionSender", MinaTransactionSender)
            .proveAndSendTransaction(tx, "included");
        },
        timeout
      );

      it(
        "should mint custom tokens",
        async () => {
          await settlementModule.utils.fetchContractAccounts(
            {
              address: tokenOwner!.address,
              tokenId: tokenOwner!.tokenId,
            },
            {
              address: tokenOwner!.address,
              tokenId: tokenOwner!.deriveTokenId(),
            }
          );

          const tx = await Mina.transaction(
            {
              sender: sequencerKey.toPublicKey(),
              memo: "Mint custom token",
              nonce: nonceCounter++,
              fee: feeStrategy.getFee(),
            },
            async () => {
              AccountUpdate.fundNewAccount(sequencerKey.toPublicKey(), 1);

              await tokenOwner!.mint(
                testAccounts[0].toPublicKey(),
                UInt64.from(100e9)
              );
              // tokenOwner!.self.body.incrementNonce = Bool(false);
            }
          );
          settlementModule.utils.signTransaction(
            tx,
            [sequencerKey],
            [tokenOwnerKey.tokenOwner, tokenOwnerKey.admin]
          );

          await appChain.sequencer
            .resolveOrFail("TransactionSender", MinaTransactionSender)
            .proveAndSendTransaction(tx, "included");
        },
        timeout
      );

      it(
        "should deploy custom token bridge",
        async () => {
          await settlementModule.deployTokenBridge(
            tokenOwner!,
            tokenOwnerKey.tokenOwner,
            tokenBridgeKey,
            {
              nonce: nonceCounter++,
            }
          );
          console.log(
            `Token bridge address: ${tokenBridgeKey.toPublicKey().toBase58()} @ ${tokenOwner!.deriveTokenId().toString()}`
          );

          expect(tokenOwner!.deriveTokenId().toString()).toStrictEqual(
            bridgedTokenId.toString()
          );
        },
        timeout
      );
    }

    it(
      "should settle",
      async () => {
        try {
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
        } catch (e) {
          console.error(e);
          throw e;
        }
      },
      timeout
    );

    it(
      "should include deposit",
      async () => {
        try {
          const { settlement, dispatch } = settlementModule.getContracts();
          const bridge = new BridgeContract(
            tokenBridgeKey.toPublicKey(),
            bridgedTokenId
          );

          const userKey = testAccounts[0];

          const depositAmount = 10n * BigInt(1e9);

          const contractBalanceBefore = bridge.account.balance.get();
          const userL2BalanceBefore =
            await appChain.query.runtime.Balances.balances.get(
              BalancesKey.from(bridgedTokenId, userKey.toPublicKey())
            );

          const tree = await TokenBridgeTree.buildTreeFromEvents(dispatch);
          const index = tree.getIndex(bridgedTokenId);
          const attestation = new TokenBridgeAttestation({
            index: Field(index),
            witness: tree.getWitness(index),
          });

          const tx = await Mina.transaction(
            {
              sender: userKey.toPublicKey(),
              fee: 0.01 * 1e9,
              nonce: user0Nonce++,
              memo: "deposit",
            },
            async () => {
              const au = AccountUpdate.createSigned(
                userKey.toPublicKey(),
                bridgedTokenId
              );
              au.balance.subInPlace(UInt64.from(depositAmount));

              await dispatch.deposit(
                UInt64.from(depositAmount),
                bridgedTokenId,
                tokenBridgeKey.toPublicKey(),
                attestation,
                userKey.toPublicKey()
              );

              if (tokenConfig !== undefined) {
                await tokenOwner!.approveAccountUpdates([au, dispatch.self]);
              }
            }
          );

          settlementModule.utils.signTransaction(
            tx,
            [userKey],
            [tokenOwnerKey.tokenOwner, dispatchKey]
          );

          await appChain.sequencer
            .resolveOrFail("TransactionSender", MinaTransactionSender)
            .proveAndSendTransaction(tx, "included");

          const actions = await Mina.fetchActions(dispatch.address);
          const balanceDiff = bridge.account.balance
            .get()
            .sub(contractBalanceBefore);

          expect(actions).toHaveLength(1);
          expect(balanceDiff.toBigInt()).toBe(depositAmount);

          const [, batch] = await createBatch(false);

          console.log("Settling");

          await trigger.settle(batch!);
          nonceCounter++;

          const [, batch2] = await createBatch(false);

          const networkstateHash = Mina.activeInstance.getAccount(
            settlement.address
          );
          console.log("On-chain values");
          console.log(
            networkstateHash.zkapp!.appState.map((x) => x.toString())
          );

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
            BalancesKey.from(bridgedTokenId, userKey.toPublicKey())
          );

          expectDefined(balance);

          const l2balanceDiff = balance.sub(
            userL2BalanceBefore ?? UInt64.from(0)
          );
          expect(l2balanceDiff.toBigInt()).toStrictEqual(depositAmount);
        } catch (e) {
          console.error(e);
          throw e;
        }
      },
      timeout
    );

    it(
      "should process withdrawal",
      async () => {
        const bridgingContract =
          await bridgingModule.getBridgeContract(bridgedTokenId);

        const userKey = testAccounts[0];

        const withdrawAmount = 10 * 1e9;

        const withdrawalTx = createTransaction({
          runtime: appChain.runtime,
          method: ["Withdrawals", "withdraw"],
          args: [
            userKey.toPublicKey(),
            UInt64.from(withdrawAmount),
            bridgedTokenId,
          ],
          nonce: acc0L2Nonce + 1,
          privateKey: userKey,
        });
        const [block, batch] = await createBatch(true, acc0L2Nonce, [
          withdrawalTx,
        ]);
        acc0L2Nonce += 2;

        console.log("Test networkstate");
        console.log(NetworkState.toJSON(block!.networkState.during));
        console.log(NetworkState.toJSON(batch!.toNetworkState));

        await trigger.settle(batch!);
        nonceCounter++;

        const txs = await bridgingModule.sendRollupTransactions({
          nonce: nonceCounter,
          bridgingContractPrivateKey: tokenBridgeKey,
          tokenOwnerPrivateKey: tokenOwnerKey.tokenOwner,
          tokenOwner: tokenOwner,
        });

        nonceCounter += 2;

        expect(txs).toHaveLength(1);

        if (baseLayerConfig.network.type !== "local") {
          await fetchAccount({
            publicKey: userKey.toPublicKey(),
            tokenId: bridgingContract.deriveTokenId(),
          });
        }
        const account = Mina.getAccount(
          userKey.toPublicKey(),
          bridgingContract.deriveTokenId()
        );

        expect(account.balance.toBigInt()).toStrictEqual(
          BigInt(withdrawAmount)
        );
      },
      timeout * 2
    );

    it(
      "should be able to redeem withdrawal",
      async () => {
        const bridgingContract =
          await bridgingModule.getBridgeContract(bridgedTokenId);

        const userKey = testAccounts[0];

        // Mina token test case
        if (baseLayerConfig.network.type !== "local") {
          await fetchAccount({
            publicKey: userKey.toPublicKey(),
            tokenId: bridgedTokenId,
          });
        }
        const balanceBefore = Mina.getAccount(
          userKey.toPublicKey(),
          bridgedTokenId
        ).balance.toBigInt();

        const amount = BigInt(1e9 * 10);

        const fee = feeStrategy.getFee();
        const tx = await Mina.transaction(
          {
            sender: userKey.toPublicKey(),
            nonce: user0Nonce++,
            fee,
            memo: "Redeem withdrawal",
          },
          async () => {
            const mintAU = AccountUpdate.createSigned(
              userKey.toPublicKey(),
              bridgedTokenId
            );
            mintAU.balance.addInPlace(amount);
            await bridgingContract.redeem(mintAU);

            // Approve AUs if necessary
            if (tokenConfig !== undefined) {
              await tokenOwner!.approveAccountUpdate(bridgingContract.self);
            }
          }
        );

        const signed = settlementModule.utils.signTransaction(
          tx,
          [userKey],
          [tokenBridgeKey, tokenOwnerKey.tokenOwner]
        );

        await appChain.sequencer
          .resolveOrFail("TransactionSender", MinaTransactionSender)
          .proveAndSendTransaction(signed, "included");

        if (baseLayerConfig.network.type !== "local") {
          await fetchAccount({
            publicKey: userKey.toPublicKey(),
            tokenId: bridgedTokenId,
          });
        }
        const balanceAfter = Mina.getAccount(
          userKey.toPublicKey(),
          bridgedTokenId
        ).balance.toBigInt();

        // tx fee
        const minaFees = BigInt(fee);

        expect(balanceAfter - balanceBefore).toBe(
          amount - (tokenConfig === undefined ? minaFees : 0n)
        );
      },
      timeout
    );
  }
};
/* eslint-enable no-inner-declarations */
