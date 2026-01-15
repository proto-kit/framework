import { inject, injectable } from "tsyringe";
import { AccountUpdate, Mina, PrivateKey, PublicKey } from "o1js";
import { log, noop } from "@proto-kit/common";

import { MinaTransactionSender } from "../../../settlement/transactions/MinaTransactionSender";
import type {
  LocalMinaBaseLayerConfig,
  MinaBaseLayer,
  MinaBaseLayerConfig,
} from "../MinaBaseLayer";

import { MinaNetworkUtils } from "./MinaNetworkUtils";

type LocalBlockchain = Awaited<ReturnType<typeof Mina.LocalBlockchain>>;

@injectable()
export class LocalBlockchainUtils implements MinaNetworkUtils {
  public constructor(
    @inject("BaseLayer") private readonly baseLayer: MinaBaseLayer,
    @inject("TransactionSender")
    private readonly transactionSender: MinaTransactionSender
  ) {}

  private keysRetrieved = 0;

  private faucetDonor?: PrivateKey = undefined;

  private assertConfigLocal(
    config: MinaBaseLayerConfig
  ): asserts config is { network: LocalMinaBaseLayerConfig } {
    if (config.network.type !== "local") {
      throw new Error("Config provided is not of type 'local'");
    }
  }

  public async getFundedAccounts(num: number = 1): Promise<PrivateKey[]> {
    this.assertConfigLocal(this.baseLayer.config);

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const local = this.baseLayer.network! as LocalBlockchain;
    const accounts = local.testAccounts.slice(
      this.keysRetrieved,
      this.keysRetrieved + num
    );
    this.keysRetrieved += num;
    return accounts.map((acc) => acc.key);
  }

  public async faucet(
    receiver: PublicKey,
    fundingAmount = 1000 * 1e9,
    fee = 0.1 * 1e9
  ) {
    this.assertConfigLocal(this.baseLayer.config);

    let { faucetDonor } = this;
    if (faucetDonor === undefined) {
      [faucetDonor] = await this.getFundedAccounts(1);
      this.faucetDonor = faucetDonor;
    }

    const accountExists = Mina.hasAccount(receiver);

    const faucetDonorPublicKey = faucetDonor.toPublicKey();

    log.provable.info(
      `Dripping ${fundingAmount / 1e9} MINA from ${faucetDonor.toBase58()} to ${receiver.toBase58()}`
    );

    const tx = await Mina.transaction(
      {
        sender: faucetDonorPublicKey,
        fee,
      },
      async () => {
        // if the destination account does not exist yet, pay the creation fee for it
        if (!accountExists) {
          AccountUpdate.fundNewAccount(faucetDonorPublicKey);
        }

        AccountUpdate.createSigned(faucetDonorPublicKey).balance.subInPlace(
          fundingAmount
        );
        AccountUpdate.create(receiver).balance.addInPlace(fundingAmount);
      }
    );

    tx.sign([faucetDonor]);

    await this.transactionSender.proveAndSendTransaction(tx, "included");

    log.provable.info(
      `Funded account ${receiver.toBase58()} with ${fundingAmount / 1e9} MINA`
    );
  }

  public async waitForNetwork() {
    noop();
  }
}
