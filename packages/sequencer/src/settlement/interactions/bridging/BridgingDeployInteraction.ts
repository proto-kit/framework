import { inject, injectable } from "tsyringe";
import { AccountUpdate, Mina, PublicKey } from "o1js";
import {
  BridgingSettlementModulesRecord,
  MandatoryProtocolModulesRecord,
  Protocol,
  SettlementContractModule,
} from "@proto-kit/protocol";
import { O1PublicKeyOption } from "@proto-kit/common";

import { DeployInteraction } from "../DeployInteraction";
import { AddressRegistry } from "../AddressRegistry";
import { MinaSigner } from "../../MinaSigner";
import { MinaBaseLayer } from "../../../protocol/baselayer/MinaBaseLayer";
import { SettlementStartupModule } from "../../../sequencer/SettlementStartupModule";
import { SignedSettlementPermissions } from "../../permissions/SignedSettlementPermissions";
import { ProvenSettlementPermissions } from "../../permissions/ProvenSettlementPermissions";
import { FeeStrategy } from "../../../protocol/baselayer/fees/FeeStrategy";
import { MinaTransactionSender } from "../../transactions/MinaTransactionSender";
import { SettlementUtils } from "../../utils/SettlementUtils";

@injectable()
export class BridgingDeployInteraction implements DeployInteraction {
  public constructor(
    @inject("AddressRegistry")
    private readonly addressRegistry: AddressRegistry,
    @inject("SettlementSigner") private readonly signer: MinaSigner,
    @inject("BaseLayer") private readonly baseLayer: MinaBaseLayer,
    @inject("Protocol")
    private readonly protocol: Protocol<MandatoryProtocolModulesRecord>,
    private readonly settlementStartupModule: SettlementStartupModule,
    @inject("FeeStrategy")
    private readonly feeStrategy: FeeStrategy,
    @inject("TransactionSender")
    private readonly transactionSender: MinaTransactionSender
  ) {}

  protected settlementContractModule(): SettlementContractModule<BridgingSettlementModulesRecord> {
    return this.protocol.dependencyContainer.resolve(
      "SettlementContractModule"
    );
  }

  public async deploy(
    {
      dispatchContract: dispatchKey,
      settlementContract: settlementKey,
    }: {
      settlementContract: PublicKey;
      dispatchContract?: PublicKey;
    },
    options: {
      nonce?: number;
    } = {}
  ) {
    if (dispatchKey === undefined) {
      throw new Error("DispatchContract address not provided");
    }

    const feepayer = this.signer.getFeepayerKey();

    const nonce = options?.nonce ?? 0;

    // TODO Move this workflow to AddressRegistry
    const sm = this.settlementContractModule();
    const {
      SettlementContract: settlementContract,
      DispatchContract: dispatchContract,
    } = sm.createContracts({
      SettlementContract: settlementKey,
      DispatchContract: dispatchKey,
    });

    const verificationsKeys =
      await this.settlementStartupModule.retrieveVerificationKeys();

    const utils = new SettlementUtils(this.baseLayer, this.signer);
    await utils.fetchContractAccounts(settlementContract, dispatchContract);

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

        await dispatchContract.deployAndInitialize(
          {
            verificationKey:
              verificationsKeys.DispatchSmartContract.verificationKey,
          },
          permissions.dispatchContract(),
          settlementContract.address
        );

        await settlementContract.deployAndInitialize(
          {
            verificationKey:
              verificationsKeys.SettlementSmartContract.verificationKey,
          },
          permissions.settlementContract(),
          feepayer,
          O1PublicKeyOption.from(dispatchKey)
        );
      }
    );

    utils.signTransaction(tx, {
      signingWithSignatureCheck: [...this.signer.getContractAddresses()],
    });
    // this.signer.signTx(tx);
    // Note: We can't use this.signTransaction on the above tx

    // This should already apply the tx result to the
    // cached accounts / local blockchain
    await this.transactionSender.proveAndSendTransaction(tx, "included");

    this.addressRegistry.addContractAddress(
      "SettlementContract",
      settlementKey
    );
    this.addressRegistry.addContractAddress("DispatchContract", dispatchKey);
  }
}
