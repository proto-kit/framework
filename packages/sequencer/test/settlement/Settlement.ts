import {
  expectDefined,
  mapSequential,
  TypedClass,
  LinkedMerkleTree,
} from "@proto-kit/common";
import { VanillaProtocolModules } from "@proto-kit/library";
import { Runtime } from "@proto-kit/module";
import {
  BlockProverPublicInput,
  BridgeContract,
  ContractArgsRegistry,
  DispatchSmartContract,
  NetworkState,
  Protocol,
  ReturnType,
  SettlementContractModule,
  SettlementSmartContractBase,
  hashNetworkState,
} from "@proto-kit/protocol";
import {
  ClientAppChain,
  BlockStorageNetworkStateModule,
  InMemoryTransactionSender,
  StateServiceQueryModule,
  InMemoryBlockExplorer,
  InMemorySigner,
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
  PublicKey,
} from "o1js";
import "reflect-metadata";
import { container } from "tsyringe";
import { FungibleToken, FungibleTokenAdmin } from "mina-fungible-token";

import {
  ManualBlockTrigger,
  PrivateMempool,
  BlockQueue,
  SettlementModule,
  MinaBaseLayer,
  SettlementProvingTask,
  MinaTransactionSender,
  MinaBaseLayerConfig,
  SignedSettlementPermissions,
  ProvenSettlementPermissions,
  VanillaTaskWorkerModules,
  Sequencer,
  InMemoryMinaSigner,
  PendingTransactionJSONType,
  CircuitAnalysisModule,
} from "../../src";
import { BlockProofSerializer } from "../../src/protocol/production/tasks/serializers/BlockProofSerializer";
import { testingSequencerModules } from "../TestingSequencer";
import { createTransaction } from "../integration/utils";
import { FeeStrategy } from "../../src/protocol/baselayer/fees/FeeStrategy";
import { BridgingModule } from "../../src/settlement/BridgingModule";
import { FungibleTokenContractModule } from "../../src/settlement/utils/FungibleTokenContractModule";
import { FungibleTokenAdminContractModule } from "../../src/settlement/utils/FungibleTokenAdminContractModule";
import { MinaNetworkUtils } from "../../src/protocol/baselayer/network-utils/MinaNetworkUtils";

import { Balances, BalancesKey } from "./mocks/Balances";
import { WithdrawalMessageProcessor, Withdrawals } from "./mocks/Withdrawals";

export const settlementTestFn = (
  settlementType: "signed" | "mock-proofs" | "proven",
  baseLayerConfig: MinaBaseLayerConfig,
  tokenConfig?: {
    tokenOwner: TypedClass<FungibleToken> & typeof SmartContract;
  },
  timeout: number = 120_000
) => {
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

  const tokenOwnerPubKeys = {
    tokenOwner: tokenOwnerKey.tokenOwner.toPublicKey(),
    admin: tokenOwnerKey.admin.toPublicKey(),
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
  let userPublicKey: PublicKey;

  let feeStrategy: FeeStrategy;

  let blockSerializer: BlockProofSerializer;

  const bridgedTokenId =
    tokenConfig === undefined ? TokenId.default : tokenOwner!.deriveTokenId();

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
          BridgingModule: BridgingModule,
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
          ...SettlementContractModule.settlementAndBridging(),
          FungibleToken: FungibleTokenContractModule,
          FungibleTokenAdmin: FungibleTokenAdminContractModule,
        }),
        WithdrawalMessageProcessor,
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
          contractKeys: [settlementKey, dispatchKey, minaBridgeKey],
          tokenBridgeKeys: [
            tokenBridgeKey,
            tokenOwnerKey.tokenOwner,
            tokenOwnerKey.admin,
          ],
        },
        BlockProducerModule: {},
        FeeStrategy: {},
        SettlementModule: {},
        BridgingModule: {},
        SequencerStartupModule: {},

        TaskQueue: {
          simulatedDuration: 0,
        },
      },
      Protocol: {
        ...Protocol.defaultConfig(),
        SettlementContractModule: {
          SettlementContract: {},
          BridgeContract: {},
          DispatchContract: {
            incomingMessagesMethods: {
              deposit: "Balances.deposit",
            },
          },
          FungibleToken: {},
          FungibleTokenAdmin: {},
        },
        WithdrawalMessageProcessor: {},
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
    txs: PendingTransactionJSONType[] = []
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
      `block ${block?.height} ${block?.fromMessagesHash} -> ${block?.toMessagesHash}`
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
  let user0Nonce = 0;
  let acc0L2Nonce = 0;

  it.skip("Print constraint summary", async () => {
    await appChain.protocol.dependencyContainer
      .resolve(CircuitAnalysisModule)
      .printSummary();
  });

  it("should throw error", async () => {
    const additionalAddresses =
      tokenConfig === undefined
        ? undefined
        : [
            {
              address: tokenBridgeKey.toPublicKey(),
              tokenId: tokenOwner!.deriveTokenId(),
            },
          ];

    await expect(
      settlementModule.checkDeployment(additionalAddresses)
    ).rejects.toThrow();
  });

  it(
    "should deploy settlement contracts",
    async () => {
      // Deploy contract
      await settlementModule.deploy(
        {
          dispatchContract: dispatchKey.toPublicKey(),
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
    "should deploy mina bridge",
    async () => {
      // Deploy contract
      await bridgingModule.deployMinaBridge(minaBridgeKey.toPublicKey(), {
        nonce: nonceCounter,
      });

      nonceCounter += 1;

      console.log("Deployed mina bridge");
    },
    timeout
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
            AccountUpdate.fundNewAccount(sequencerKey.toPublicKey(), 3);

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
              src: "",
              symbol: "TEST",
              allowUpdates: false,
            });
            tokenOwner!.self.account.permissions.set(
              permissions.bridgeContractToken()
            );

            await tokenOwner!.initialize(
              tokenOwnerKey.admin.toPublicKey(),
              UInt8.from(9),
              Bool(false)
            );
          }
        );
        console.log(tx.toPretty());

        settlementModule.utils.signTransaction(tx, {
          signingWithSignatureCheck: [
            tokenOwnerPubKeys.tokenOwner,
            tokenOwnerPubKeys.admin,
            settlementModule.getSettlementContractAddress(),
            bridgingModule.getDispatchContractAddress(),
          ],
        });

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
        settlementModule.utils.signTransaction(tx, {
          signingWithSignatureCheck: [
            tokenOwnerPubKeys.tokenOwner,
            tokenOwnerPubKeys.admin,
          ],
        });

        await appChain.sequencer
          .resolveOrFail("TransactionSender", MinaTransactionSender)
          .proveAndSendTransaction(tx, "included");
      },
      timeout
    );

    it(
      "should deploy custom token bridge",
      async () => {
        await bridgingModule.deployTokenBridge(
          tokenOwner!,
          tokenBridgeKey.toPublicKey(),
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
        expectDefined(lastBlock);
        expectDefined(lastBlock.result);
        expect(settlement.networkStateHash.get().toString()).toStrictEqual(
          hashNetworkState(lastBlock!.result.afterNetworkState).toString()
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

  it(
    "should include deposit",
    async () => {
      try {
        const settlement = settlementModule.getSettlementContract();
        const dispatch =
          bridgingModule.getDispatchContract() as DispatchSmartContract;
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

        const attestation =
          await bridgingModule.getDepositContractAttestation(bridgedTokenId);

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

        // Register userKey, to use later.
        userPublicKey = settlementModule.utils.registerKey(userKey);

        settlementModule.utils.signTransaction(tx, {
          signingWithSignatureCheck: [
            tokenOwnerPubKeys.tokenOwner,
            settlementModule.getSettlementContractAddress(),
          ],
          signingPublicKeys: [userPublicKey],
          preventNoncePreconditionFor: [dispatch.address],
        });

        console.log(tx.toPretty());

        await appChain.sequencer
          .resolveOrFail("TransactionSender", MinaTransactionSender)
          .proveAndSendTransaction(tx, "included");

        const actions = await Mina.fetchActions(dispatch.address);
        if (baseLayerConfig.network.type !== "local") {
          await fetchAccount({
            publicKey: tokenBridgeKey.toPublicKey(),
            tokenId: bridgedTokenId,
          });
        }
        const balanceDiff = bridge.account.balance
          .get()
          .sub(contractBalanceBefore);

        expect(actions).toHaveLength(1);
        expect(balanceDiff.toString()).toBe(depositAmount.toString());

        const [, batch] = await createBatch(false);

        console.log("Settling");

        await trigger.settle(batch!, {});
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
        console.log(hashNetworkState(batch!.toNetworkState));
        console.log(hashNetworkState(batch2!.fromNetworkState));

        expect(hashNetworkState(batch!.toNetworkState)).toStrictEqual(
          hashNetworkState(batch2!.fromNetworkState)
        );

        expect(batch2!.blockHashes).toHaveLength(1);

        await trigger.settle(batch2!, {});
        nonceCounter++;

        const balance = await appChain.query.runtime.Balances.balances.get(
          BalancesKey.from(bridgedTokenId, userKey.toPublicKey())
        );

        expectDefined(balance);

        const l2balanceDiff = balance.sub(
          userL2BalanceBefore ?? UInt64.from(0)
        );
        expect(l2balanceDiff.toString()).toStrictEqual(
          depositAmount.toString()
        );
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

      expectDefined(block);
      expect(block.transactions[0].status).toBe(true);
      expectDefined(batch);

      console.log("Test networkstate");
      console.log(block.networkState.during);
      console.log(batch.toNetworkState);

      const settlementResult = await trigger.settle(batch, {
        [bridgedTokenId.toString()]: {
          bridgingContractPublicKey: tokenBridgeKey.toPublicKey(),
          tokenOwnerPublicKey: tokenOwnerKey.tokenOwner.toPublicKey(),
          tokenOwner: tokenOwner,
        },
      });

      expectDefined(settlementResult);
      expectDefined(settlementResult.bridgeTransactions);

      nonceCounter += settlementResult.bridgeTransactions.length;

      expect(settlementResult.bridgeTransactions).toHaveLength(2);

      await settlementModule.utils.fetchContractAccounts({
        address: userKey.toPublicKey(),
        tokenId: bridgingContract.deriveTokenId(),
      });

      const account = Mina.getAccount(
        userKey.toPublicKey(),
        bridgingContract.deriveTokenId()
      );

      expect(account.balance.toString()).toStrictEqual(
        withdrawAmount.toString()
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

      const signed = settlementModule.utils.signTransaction(tx, {
        signingWithSignatureCheck: [
          tokenBridgeKey.toPublicKey(),
          tokenOwnerPubKeys.tokenOwner,
          settlementModule.getSettlementContractAddress(),
        ],
        signingPublicKeys: [userPublicKey],
      });

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

      expect((balanceAfter - balanceBefore).toString()).toBe(
        (amount - (tokenConfig === undefined ? minaFees : 0n)).toString()
      );
    },
    timeout
  );

  it("should not throw error after settlement", async () => {
    expect.assertions(1);

    // Obtain promise of deployment check
    const additionalAddresses =
      tokenConfig === undefined
        ? undefined
        : [
            {
              address: tokenBridgeKey.toPublicKey(),
              tokenId: tokenOwner!.deriveTokenId(),
            },
          ];

    await expect(
      settlementModule.checkDeployment(additionalAddresses)
    ).resolves.toBeUndefined();
  });
};
