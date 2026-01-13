import { inject, injectable } from "tsyringe";
import { AccountUpdate, Mina, PublicKey } from "o1js";
import {
  MandatoryProtocolModulesRecord,
  MandatorySettlementModulesRecord,
  Protocol,
  SettlementContractModule,
} from "@proto-kit/protocol";
import { log, O1PublicKeyOption } from "@proto-kit/common";

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
export class VanillaDeployInteraction implements DeployInteraction {
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

  protected settlementContractModule(): SettlementContractModule<MandatorySettlementModulesRecord> {
    return this.protocol.dependencyContainer.resolve(
      "SettlementContractModule"
    );
  }

  public async deploy(
    {
      settlementContract: settlementKey,
      dispatchContract: dispatchKey,
    }: {
      settlementContract: PublicKey;
      dispatchContract?: PublicKey;
    },
    options: {
      nonce?: number;
    } = {}
  ) {
    if (dispatchKey !== undefined) {
      log.error(
        "DispatchContract address provided for deploy(), however the module configuration hints at a " +
          "settlement-only deployment, therefore the DispatchContract will not be deployed"
      );
    }

    const feepayer = this.signer.getFeepayerKey();

    const nonce = options?.nonce ?? 0;

    const sm = this.settlementContractModule();
    const { SettlementContract: settlementContract } = sm.createContracts({
      SettlementContract: settlementKey,
    });

    const utils = new SettlementUtils(this.baseLayer, this.signer);
    await utils.fetchContractAccounts(settlementContract);

    const verificationsKeys =
      await this.settlementStartupModule.retrieveVerificationKeys({
        SettlementContract: true,
      });

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
        AccountUpdate.fundNewAccount(feepayer, 1);

        await settlementContract.deployAndInitialize(
          {
            verificationKey:
              verificationsKeys.SettlementContract.verificationKey,
          },
          permissions.settlementContract(),
          feepayer,
          O1PublicKeyOption.none()
        );
      }
    );

    utils.signTransaction(tx, {
      signingWithSignatureCheck: [...this.signer.getContractAddresses()],
    });

    await this.transactionSender.proveAndSendTransaction(tx, "included");

    this.addressRegistry.addContractAddress(
      "SettlementContract",
      settlementKey
    );
  }
}
