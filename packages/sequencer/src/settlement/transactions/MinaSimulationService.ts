import { inject, injectable } from "tsyringe";
import {
  addCachedAccount,
  fetchAccount,
  fetchLastBlock,
  Field,
  Ledger,
  Mina,
  PublicKey,
} from "o1js";
import { ReturnType } from "@proto-kit/protocol";
import { match } from "ts-pattern";

import { MinaBaseLayer } from "../../protocol/baselayer/MinaBaseLayer";

@injectable()
export class MinaSimulationService {
  public constructor(
    @inject("BaseLayer") private readonly baseLayer: MinaBaseLayer
  ) {}

  private ledger = Ledger.create();

  private networkState: ReturnType<typeof Mina.getNetworkState> | undefined =
    undefined;

  private async fetchGraphql<Type>(
    f: () => Promise<Type>
  ): Promise<Type | undefined> {
    if (!this.baseLayer.config.network.local) {
      return await f();
    }
    return undefined;
  }

  public async updateNetworkState() {
    const block = await this.fetchGraphql(() => fetchLastBlock());
    this.networkState = block ?? Mina.getNetworkState();
  }

  public async updateAccount(publicKey: PublicKey, tokenId?: Field) {
    const fetchedAccount = await this.fetchGraphql(() =>
      fetchAccount({ publicKey, tokenId })
    );
    const getAccountSafe = () => {
      try {
        return Mina.getAccount(publicKey, tokenId);
      } catch {
        return undefined;
      }
    };
    const account = match(fetchedAccount)
      .with(undefined, () => getAccountSafe())
      .with({ account: undefined }, () => getAccountSafe())
      .with({ error: undefined }, (v) => v.account)
      .exhaustive();

    // this.ledger.addAccount(Ml.fromPublicKey(publicKey));

    if (account !== undefined) {
      addCachedAccount(account);
    }
  }

  public applyTransaction(tx: Mina.Transaction<boolean, boolean>) {
    const txJson = tx.toJSON();
    this.ledger.applyJsonTransaction(
      txJson,
      String(1e9),
      JSON.stringify(this.networkState)
    );
  }
}
