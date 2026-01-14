import { inject, injectable } from "tsyringe";
import {
  AccountUpdate,
  fetchAccount,
  fetchLastBlock,
  Lightnet,
  Mina,
  PrivateKey,
  PublicKey,
} from "o1js";
import { log, noop, range, sleep } from "@proto-kit/common";

import type {
  LightnetMinaBaseLayerConfig,
  MinaBaseLayer,
  MinaBaseLayerConfig,
} from "../MinaBaseLayer";
import { MinaTransactionSender } from "../../../settlement/transactions/MinaTransactionSender";

import { MinaNetworkUtils } from "./MinaNetworkUtils";

@injectable()
export class LightnetUtils implements MinaNetworkUtils {
  public constructor(
    @inject("BaseLayer")
    private readonly baseLayer: MinaBaseLayer,
    @inject("TransactionSender")
    private readonly transactionSender: MinaTransactionSender
  ) {}

  public async waitForNetwork(): Promise<void> {
    const maxAttempts = 24;
    const delay = 5000;

    let lastBlock;
    let attempt = 0;

    const { config } = this.baseLayer;
    this.assertConfigLightnet(config);
    const graphqlEndpoint = config.network.graphql;

    log.info("Waiting for network to be ready...");

    while (!lastBlock) {
      attempt += 1;
      if (attempt > maxAttempts) {
        throw new Error(
          `Network was still not ready after ${(delay / 1000) * (attempt - 1)}s`
        );
      }
      try {
        // eslint-disable-next-line no-await-in-loop
        lastBlock = await fetchLastBlock(graphqlEndpoint);
      } catch (e) {
        // Ignore errors
        noop();
      }
      // eslint-disable-next-line no-await-in-loop
      await sleep(delay);
    }

    log.provable.info("Network is ready", lastBlock);
  }

  private assertConfigLightnet(
    config: MinaBaseLayerConfig
  ): asserts config is { network: LightnetMinaBaseLayerConfig } {
    if (config.network.type !== "lightnet") {
      throw new Error("Config provided is not of type 'lightnet'");
    }
  }

  public async faucet(
    receiver: PublicKey,
    fundingAmount = 1000 * 1e9,
    fee = 0.1 * 1e9
  ) {
    const [faucetDonor] = await this.getFundedAccounts(1);

    const account = await fetchAccount({ publicKey: receiver });

    log.provable.info(
      `Dripping ${fundingAmount / 1e9} MINA from ${faucetDonor.toBase58()} to ${receiver.toBase58()}`
    );

    const faucetDonorPublicKey = faucetDonor.toPublicKey();

    const tx = await Mina.transaction(
      {
        sender: faucetDonorPublicKey,
        fee,
      },
      async () => {
        // if the destination account does not exist yet, pay the creation fee for it
        if (account.error) {
          AccountUpdate.fundNewAccount(faucetDonorPublicKey);
        }

        AccountUpdate.createSigned(faucetDonorPublicKey).balance.subInPlace(
          fundingAmount
        );
        AccountUpdate.create(receiver).balance.addInPlace(fundingAmount);
      }
    );

    tx.sign([faucetDonor]);

    await this.transactionSender.signProveAndSendTransaction(
      tx,
      [faucetDonorPublicKey],
      "included"
    );

    log.provable.info(
      `Funded account ${receiver.toBase58()} with ${fundingAmount / 1e9} MINA`
    );

    await Lightnet.releaseKeyPair({
      publicKey: faucetDonor.toPublicKey().toBase58(),
      lightnetAccountManagerEndpoint: this.getAccountManagerEndpoint(),
    });
  }

  private getAccountManagerEndpoint() {
    const {
      baseLayer: { config },
    } = this;

    this.assertConfigLightnet(config);

    if (config.network.accountManager === undefined) {
      throw new Error(
        "Wanted to retrieve funded keypairs, but accountManager endpoint is missing in config"
      );
    }

    return config.network.accountManager;
  }

  public async getFundedAccounts(num: number = 1): Promise<PrivateKey[]> {
    const lightnetAccountManagerEndpoint = this.getAccountManagerEndpoint();

    return await Promise.all(
      range(num).map(async (i) => {
        const pair = await Lightnet.acquireKeyPair({
          isRegularAccount: true,
          lightnetAccountManagerEndpoint,
        });
        return pair.privateKey;
      })
    );
  }
}
