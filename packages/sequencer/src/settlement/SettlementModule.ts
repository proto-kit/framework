import {
  Protocol,
  SettlementContractModule,
  BATCH_SIGNATURE_PREFIX,
  DispatchSmartContract,
  SettlementSmartContract,
  MandatorySettlementModulesRecord,
  MandatoryProtocolModulesRecord,
  SettlementSmartContractBase,
  DynamicBlockProof,
} from "@proto-kit/protocol";
import { AccountUpdate, fetchAccount, Field, Mina, PublicKey, TokenContract, TokenId } from "o1js";
import { inject } from "tsyringe";
import {
  EventEmitter,
  EventEmittingComponent,
  log,
  DependencyFactory,
} from "@proto-kit/common";
// eslint-disable-next-line import/no-extraneous-dependencies
import truncate from "lodash/truncate";

import {
  SequencerModule,
  sequencerModule,
} from "../sequencer/builder/SequencerModule";
import type { MinaBaseLayer } from "../protocol/baselayer/MinaBaseLayer";
import { Batch, SettleableBatch } from "../storage/model/Batch";
import { BlockProofSerializer } from "../protocol/production/tasks/serializers/BlockProofSerializer";
import { Settlement } from "../storage/model/Settlement";
import { FeeStrategy } from "../protocol/baselayer/fees/FeeStrategy";
import { SettlementStartupModule } from "../sequencer/SettlementStartupModule";
import { SettlementStorage } from "../storage/repositories/SettlementStorage";

import { MinaTransactionSender } from "./transactions/MinaTransactionSender";
import { ProvenSettlementPermissions } from "./permissions/ProvenSettlementPermissions";
import { SignedSettlementPermissions } from "./permissions/SignedSettlementPermissions";
import { SettlementUtils } from "./utils/SettlementUtils";
import { BridgingModule } from "./BridgingModule";
import { MinaSigner } from "./MinaSigner";

export type SettlementModuleEvents = {
  "settlement-submitted": [Batch];
};

@sequencerModule()
export class SettlementModule
  extends SequencerModule
  implements EventEmittingComponent<SettlementModuleEvents>, DependencyFactory
{
  protected contracts?: {
    settlement: SettlementSmartContract;
    dispatch: DispatchSmartContract;
  };

  public utils: SettlementUtils;

  public events = new EventEmitter<SettlementModuleEvents>();

  public constructor(
    @inject("BaseLayer") private readonly baseLayer: MinaBaseLayer,
    @inject("Protocol")
    private readonly protocol: Protocol<MandatoryProtocolModulesRecord>,
    @inject("SettlementStorage")
    private readonly settlementStorage: SettlementStorage,
    private readonly blockProofSerializer: BlockProofSerializer,
    @inject("TransactionSender")
    private readonly transactionSender: MinaTransactionSender,
    @inject("SettlementSigner") private readonly signer: MinaSigner,
    @inject("FeeStrategy")
    private readonly feeStrategy: FeeStrategy,
    private readonly settlementStartupModule: SettlementStartupModule
  ) {
    super();
    this.utils = new SettlementUtils(this.baseLayer, this.signer);
  }

  public dependencies() {
    return {
      BridgingModule: {
        useClass: BridgingModule,
      },
    };
  }

  protected settlementContractModule(): SettlementContractModule<MandatorySettlementModulesRecord> {
    return this.protocol.dependencyContainer.resolve(
      "SettlementContractModule"
    );
  }

  public getAddresses() {
    const keysArray = this.signer.getContractAddresses();
    return {
      settlement: keysArray[0],
      dispatch: keysArray[1],
    };
  }

  public getContractAddresses() {
    return this.signer.getContractAddresses();
  }

  public getContracts() {
    if (this.contracts === undefined) {
      const addresses = this.getAddresses();
      const { protocol } = this;

      const settlementContractModule = protocol.dependencyContainer.resolve<
        SettlementContractModule<MandatorySettlementModulesRecord>
      >("SettlementContractModule");

      // TODO Add generic inference of concrete Contract types
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      this.contracts = settlementContractModule.createContracts(addresses) as {
        settlement: SettlementSmartContract;
        dispatch: DispatchSmartContract;
      };
    }
    return this.contracts;
  }

  private async fetchContractAccounts() {
    const contracts = this.getContracts();
    await this.utils.fetchContractAccounts(
      contracts.settlement,
      contracts.dispatch
    );
  }

  public async settleBatch(
    batch: SettleableBatch,
    options: {
      nonce?: number;
    } = {}
  ): Promise<Settlement> {
    await this.fetchContractAccounts();
    const { settlement: settlementContract, dispatch } = this.getContracts();
    const feepayer = this.signer.getFeepayerKey();
    log.debug("Preparing settlement");

    const lastSettlementL1BlockHeight =
      settlementContract.lastSettlementL1BlockHeight.get().value;
    const signature = this.signer.sign([
      BATCH_SIGNATURE_PREFIX,
      lastSettlementL1BlockHeight,
    ]);

    const latestSequenceStateHash = dispatch.account.actionState.get();

    const blockProof = await this.blockProofSerializer
      .getBlockProofSerializer()
      .fromJSONProof(batch.proof);

    const dynamicBlockProof = DynamicBlockProof.fromProof(blockProof);

    const tx = await Mina.transaction(
      {
        sender: feepayer,
        nonce: options?.nonce,
        fee: this.feeStrategy.getFee(),
        memo: "Protokit settle",
      },
      async () => {
        await settlementContract.settle(
          dynamicBlockProof,
          signature,
          dispatch.address,
          feepayer,
          batch.fromNetworkState,
          batch.toNetworkState,
          latestSequenceStateHash
        );
      }
    );

    this.utils.signTransaction(tx, {
      signingWithSignatureCheck: [...this.signer.getContractAddresses()],
    });

    const { hash: transactionHash } =
      await this.transactionSender.proveAndSendTransaction(tx, "included");

    log.info("Settlement transaction sent and included");

    const settlement = {
      batches: [batch.height],
      promisedMessagesHash: latestSequenceStateHash.toString(),
      transactionHash,
    };

    await this.settlementStorage.pushSettlement(settlement);

    this.events.emit("settlement-submitted", batch);

    return settlement;
  }

  // Can't do anything for now - initialize() method use settlementKey.
  public async deploy(
    settlementKey: PublicKey,
    dispatchKey: PublicKey,
    minaBridgeKey: PublicKey,
    options: {
      nonce?: number;
    } = {}
  ) {
    const feepayer = this.signer.getFeepayerKey();

    const nonce = options?.nonce ?? 0;

    const sm = this.protocol.dependencyContainer.resolve<
      SettlementContractModule<MandatorySettlementModulesRecord>
    >("SettlementContractModule");
    const { settlement, dispatch } = sm.createContracts({
      settlement: settlementKey,
      dispatch: dispatchKey,
    });

    const verificationsKeys =
      await this.settlementStartupModule.retrieveVerificationKeys();

    const permissions = this.baseLayer.isSignedSettlement()
      ? new SignedSettlementPermissions()
      : new ProvenSettlementPermissions();

    const tx = await Mina.transaction(
      {
        sender: feepayer,
        nonce,
        fee: this.feeStrategy.getFee(),
        memo: "Protokit settlement deploy",
      },
      async () => {
        AccountUpdate.fundNewAccount(feepayer, 2);

        await dispatch.deployAndInitialize(
          {
            verificationKey:
              verificationsKeys.DispatchSmartContract.verificationKey,
          },
          permissions.dispatchContract(),
          settlement.address
        );

        await settlement.deployAndInitialize(
          {
            verificationKey:
              verificationsKeys.SettlementSmartContract.verificationKey,
          },
          permissions.settlementContract(),
          feepayer,
          dispatchKey
        );
      }
    );

    this.utils.signTransaction(tx, {
      signingWithSignatureCheck: [...this.signer.getContractAddresses()],
    });
    // Note: We can't use this.signTransaction on the above tx

    // This should already apply the tx result to the
    // cached accounts / local blockchain
    await this.transactionSender.proveAndSendTransaction(tx, "included");

    await this.utils.fetchContractAccounts(settlement, dispatch);

    const initTx = await Mina.transaction(
      {
        sender: feepayer,
        nonce: nonce + 1,
        fee: this.feeStrategy.getFee(),
        memo: "Deploy MINA bridge",
      },
      async () => {
        AccountUpdate.fundNewAccount(feepayer, 1);
        // Deploy bridge contract for $Mina
        await settlement.addTokenBridge(
          TokenId.default,
          minaBridgeKey,
          dispatchKey
        );
      }
    );

    const initTxSigned = this.utils.signTransaction(initTx, {
      signingWithSignatureCheck: [
        ...this.signer.getContractAddresses(),
        minaBridgeKey,
      ],
    });

    await this.transactionSender.proveAndSendTransaction(
      initTxSigned,
      "included"
    );
  }

  public async deployTokenBridge(
    owner: TokenContract,
    ownerPublicKey: PublicKey,
    contractKey: PublicKey,
    options: {
      nonce?: number;
    }
  ) {
    const feepayer = this.signer.getFeepayerKey();
    const nonce = options?.nonce ?? undefined;

    const tokenId = owner.deriveTokenId();
    const { settlement, dispatch } = this.getContracts();

    const tx = await Mina.transaction(
      {
        sender: feepayer,
        nonce: nonce,
        memo: `Deploy token bridge for ${truncate(tokenId.toString(), { length: 6 })}`,
        fee: this.feeStrategy.getFee(),
      },
      async () => {
        AccountUpdate.fundNewAccount(feepayer, 1);
        await settlement.addTokenBridge(tokenId, contractKey, dispatch.address);
        await owner.approveAccountUpdate(settlement.self);
      }
    );

    // Only ContractKeys and OwnerKey for check.
    // Used all in signing process.
    const txSigned = this.utils.signTransaction(tx, {
      signingWithSignatureCheck: [
        ...this.signer.getContractAddresses(),
        ownerPublicKey,
      ],
      signingPublicKeys: [contractKey],
    });

    await this.transactionSender.proveAndSendTransaction(txSigned, "included");
  }

  public async start(): Promise<void> {
    const contractArgs = SettlementSmartContractBase.args;

    SettlementSmartContractBase.args = {
      ...contractArgs,
      signedSettlements: this.baseLayer.isSignedSettlement(),
      // TODO Add distinction between mina and custom tokens
      BridgeContractPermissions: (this.baseLayer.isSignedSettlement()
        ? new SignedSettlementPermissions()
        : new ProvenSettlementPermissions()
      ).bridgeContractMina(),
    };
  }
  
  public async checkDeployment(
  tokenBridges?: Array<{ address: PublicKey; tokenId: Field }>
): Promise<void | never> {
  const contractAddresses = this.getContractAddresses();
  
  if (this.baseLayer.config.network.type !== 'local') {
    // Check main contracts
    await Promise.all(
      contractAddresses.map(async (pubKey) => {
        const { account, error } = await fetchAccount({ publicKey: pubKey });
        if (!account || !!error) {
          throw new Error(`Error finding account ${pubKey.toBase58()}`);
        }
      })
    );
    
    // Check token bridges with their tokenIds
    if (tokenBridges) {
      await Promise.all(
        tokenBridges.map(async ({ address, tokenId }) => {
          const { account, error } = await fetchAccount({ 
            publicKey: address, 
            tokenId 
          });
          if (!account || !!error) {
            throw new Error(`Error finding token bridge ${address.toBase58()} @ ${tokenId.toString()}`);
          }
        })
      );
    }
  } else {
    // Local network
    contractAddresses.forEach((pubKey) => {
      if (!Mina.hasAccount(pubKey)) {
        throw new Error(`Contract ${pubKey.toBase58()} not found on local chain`);
      }
    });
    
    // Check token bridges
    if (tokenBridges) {
      tokenBridges.forEach(({ address, tokenId }) => {
        if (!Mina.hasAccount(address, tokenId)) {
          throw new Error(`Token bridge ${address.toBase58()} @ ${tokenId.toString()} not found`);
        }
      });
    }
  }
}
}
