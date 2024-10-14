import { injectable, inject } from "tsyringe";
import { range } from "@proto-kit/common";
import { PrivateKey, Mina, Lightnet, PublicKey, AccountUpdate } from "o1js";

import { MinaTransactionSender } from "../../../settlement/transactions/MinaTransactionSender";
import { BaseLayer } from "../BaseLayer";
import { MinaBaseLayer } from "../MinaBaseLayer";
import { FeeStrategy } from "../fees/FeeStrategy";

type LocalBlockchain = Awaited<ReturnType<typeof Mina.LocalBlockchain>>;

@injectable()
export class MinaBlockchainAccounts {
  public constructor(
    @inject("BaseLayer")
    private readonly baseLayer: BaseLayer,
    @inject("TransactionSender")
    private readonly transactionSender: MinaTransactionSender,
    @inject("FeeStrategy")
    private readonly feeStrategy: FeeStrategy
  ) {}

  private keysRetrieved = 0;

  private isMinaBaseLayer(
    baseLayer: BaseLayer | undefined
  ): baseLayer is MinaBaseLayer {
    return baseLayer !== undefined && baseLayer instanceof MinaBaseLayer;
  }

  public async getFundedAccounts(num: number = 1): Promise<PrivateKey[]> {
    const { baseLayer } = this;
    if (!this.isMinaBaseLayer(baseLayer)) {
      throw new Error("Baselayer not defined or not subclass of MinaBaseLayer");
    }
    if (baseLayer.config.network.type === "local") {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const local = baseLayer.network! as LocalBlockchain;
      const accounts = local.testAccounts.slice(
        this.keysRetrieved,
        this.keysRetrieved + num
      );
      this.keysRetrieved += num;
      return accounts.map((acc) => acc.key);
    }
    if (baseLayer.config.network.type === "lightnet") {
      return await Promise.all(
        range(num).map(async (i) => {
          const pair = await Lightnet.acquireKeyPair({
            isRegularAccount: true,
          });
          return pair.privateKey;
        })
      );
    }
    throw new Error("Can't acquire keys for remote non-lighnet network");
  }

  public async fundAccountFrom(
    sender: PrivateKey,
    receiver: PublicKey,
    amount: number
  ) {
    const { baseLayer } = this;
    if (!this.isMinaBaseLayer(baseLayer)) {
      throw new Error("Baselayer not defined or not subclass of MinaBaseLayer");
    }
    if (baseLayer.config.network.type === "local") {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      (baseLayer.network as LocalBlockchain).addAccount(
        receiver,
        amount.toString()
      );
    } else {
      const tx = await Mina.transaction(
        { sender: sender.toPublicKey(), fee: this.feeStrategy.getFee() },
        async () => {
          AccountUpdate.fundNewAccount(sender.toPublicKey());
          AccountUpdate.createSigned(sender.toPublicKey()).send({
            to: receiver,
            amount,
          });
        }
      );
      await this.transactionSender.proveAndSendTransaction(
        tx.sign([sender]),
        "included"
      );
    }
  }
}
