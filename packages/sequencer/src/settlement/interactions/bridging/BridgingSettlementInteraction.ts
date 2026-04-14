import { inject, injectable } from "tsyringe";
import { Mina } from "o1js";
import {
  BATCH_SIGNATURE_PREFIX,
  BridgingSettlementModulesRecord,
  DynamicBlockProof,
  MandatoryProtocolModulesRecord,
  Protocol,
  SettlementContractModule,
} from "@proto-kit/protocol";
import { log } from "@proto-kit/common";

import { AddressRegistry } from "../AddressRegistry";
import { MinaSigner } from "../../MinaSigner";
import { MinaBaseLayer } from "../../../protocol/baselayer/MinaBaseLayer";
import { FeeStrategy } from "../../../protocol/baselayer/fees/FeeStrategy";
import { MinaTransactionSender } from "../../transactions/MinaTransactionSender";
import { SettlementUtils } from "../../utils/SettlementUtils";
import { BlockProofSerializer } from "../../../protocol/production/tasks/serializers/BlockProofSerializer";
import { SettleableBatch } from "../../../storage/model/Batch";
import { Settlement } from "../../../storage/model/Settlement";
import { SettleInteraction } from "../SettleInteraction";

@injectable()
export class BridgingSettlementInteraction implements SettleInteraction {
  public constructor(
    @inject("AddressRegistry")
    private readonly addressRegistry: AddressRegistry,
    @inject("SettlementSigner") private readonly signer: MinaSigner,
    @inject("BaseLayer") private readonly baseLayer: MinaBaseLayer,
    @inject("Protocol")
    private readonly protocol: Protocol<MandatoryProtocolModulesRecord>,
    @inject("FeeStrategy")
    private readonly feeStrategy: FeeStrategy,
    @inject("TransactionSender")
    private readonly transactionSender: MinaTransactionSender,
    private readonly blockProofSerializer: BlockProofSerializer
  ) {}

  protected settlementContractModule(): SettlementContractModule<BridgingSettlementModulesRecord> {
    return this.protocol.dependencyContainer.resolve(
      "SettlementContractModule"
    );
  }

  public async settle(
    batch: SettleableBatch,
    options: {
      nonce?: number;
    } = {}
  ): Promise<Settlement> {
    const feepayer = this.signer.getFeepayerKey();

    const settlementKey =
      this.addressRegistry.getContractAddress("SettlementContract");
    const dispatchKey =
      this.addressRegistry.getContractAddress("DispatchContract");

    if (settlementKey === undefined || dispatchKey === undefined) {
      throw new Error(
        "Settlement and/or DispatchContract addresses haven't been initialized"
      );
    }

    const sm = this.settlementContractModule();
    const {
      SettlementContract: settlementContract,
      DispatchContract: dispatchContract,
    } = sm.createContracts({
      SettlementContract: settlementKey,
      DispatchContract: dispatchKey,
    });

    const utils = new SettlementUtils(this.baseLayer, this.signer);
    await utils.fetchContractAccounts(settlementContract, dispatchContract);

    const lastSettlementL1BlockHeight =
      settlementContract.lastSettlementL1BlockHeight.get().value;
    const signature = this.signer.sign([
      BATCH_SIGNATURE_PREFIX,
      lastSettlementL1BlockHeight,
    ]);

    const latestSequenceStateHash = dispatchContract.account.actionState.get();

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
          feepayer,
          batch.fromNetworkState,
          batch.toNetworkState,
          latestSequenceStateHash
        );
      }
    );

    utils.signTransaction(tx, {
      signingWithSignatureCheck: this.signer.getContractAddresses(),
    });

    const { hash: transactionHash } =
      await this.transactionSender.proveAndSendTransaction(tx, "included");

    log.info("Settlement transaction sent and included");

    return {
      batches: [batch.height],
      promisedMessagesHash: latestSequenceStateHash.toString(),
      transactionHash,
      createdAt: new Date(),
    };
  }
}
