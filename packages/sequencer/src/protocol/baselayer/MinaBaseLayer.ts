import {
  AreProofsEnabled,
  DependencyFactory,
  ModuleContainerLike,
} from "@proto-kit/common";
import { Mina } from "o1js";
import { match } from "ts-pattern";
import { inject } from "tsyringe";

import { MinaIncomingMessageAdapter } from "../../settlement/messages/MinaIncomingMessageAdapter";
import {
  sequencerModule,
  SequencerModule,
} from "../../sequencer/builder/SequencerModule";
import { MinaTransactionSender } from "../../settlement/transactions/MinaTransactionSender";
import { DefaultOutgoingMessageAdapter } from "../../settlement/messages/outgoing/DefaultOutgoingMessageAdapter";

import { BaseLayer, StaticBaseLayer } from "./BaseLayer";
import { LocalBlockchainUtils } from "./network-utils/LocalBlockchainUtils";
import { LightnetUtils } from "./network-utils/LightnetUtils";
import { RemoteNetworkUtils } from "./network-utils/RemoteNetworkUtils";
import { MinaNetworkUtils } from "./network-utils/MinaNetworkUtils";

export type LocalMinaBaseLayerConfig = {
  type: "local";
};

export type LightnetMinaBaseLayerConfig = {
  type: "lightnet";
  graphql: string;
  archive: string;
  accountManager?: string;
};

export type RemoteMinaBaseLayerConfig = {
  type: "remote";
  graphql: string;
  archive: string;
};

export interface MinaBaseLayerConfig {
  network:
    | LocalMinaBaseLayerConfig
    | LightnetMinaBaseLayerConfig
    | RemoteMinaBaseLayerConfig;
}

@sequencerModule()
export class MinaBaseLayer
  extends SequencerModule<MinaBaseLayerConfig>
  implements BaseLayer, DependencyFactory
{
  public network?: Parameters<typeof Mina.setActiveInstance>[0];

  public originalNetwork?: Parameters<typeof Mina.setActiveInstance>[0];

  public constructor(
    @inject("AreProofsEnabled")
    private readonly areProofsEnabled: AreProofsEnabled,
    @inject("Sequencer")
    private readonly sequencer: ModuleContainerLike
  ) {
    super();
  }

  public static dependencies() {
    return {
      IncomingMessageAdapter: {
        useClass: MinaIncomingMessageAdapter,
      },

      TransactionSender: {
        useClass: MinaTransactionSender,
      },

      OutgoingMessageAdapter: {
        useClass: DefaultOutgoingMessageAdapter,
      },
    };
  }

  public dependencies() {
    const NetworkUtilsClass = match(this.config.network.type)
      .with("local", () => LocalBlockchainUtils)
      .with("lightnet", () => LightnetUtils)
      .with("remote", () => RemoteNetworkUtils)
      .exhaustive();

    return {
      NetworkUtils: {
        useClass: NetworkUtilsClass,
      },
    };
  }

  public get networkUtils() {
    if (this.config.network.type === "remote") {
      throw new Error("NetworkUtils not available for remote networks");
    }
    return this.sequencer.dependencyContainer.resolve<MinaNetworkUtils>(
      "NetworkUtils"
    );
  }

  public isLocalBlockChain(): boolean {
    return this.config.network.type === "local";
  }

  /**
   * Signed settlement happens when proofs are disabled and the network is remote
   * This is because on local network we can use mock proofs, while on remotes ones we can't
   */
  public isSignedSettlement(): boolean {
    return !this.areProofsEnabled.areProofsEnabled && !this.isLocalBlockChain();
  }

  public async start(): Promise<void> {
    const { network } = this.config;

    this.originalNetwork = Mina.activeInstance;

    const Network = await match(network)
      .with(
        { type: "local" },
        async () =>
          await Mina.LocalBlockchain({
            proofsEnabled: this.areProofsEnabled.areProofsEnabled,
          })
      )
      .with({ type: "lightnet" }, async (lightnet) => {
        const net = Mina.Network({
          mina: lightnet.graphql,
          archive: lightnet.archive,
          lightnetAccountManager: lightnet.accountManager,
        });
        net.proofsEnabled = this.areProofsEnabled.areProofsEnabled;
        return net;
      })
      .with({ type: "remote" }, async (remote) =>
        Mina.Network({
          mina: remote.graphql,
          archive: remote.archive,
        })
      )
      .exhaustive();

    Mina.setActiveInstance(Network);
    this.network = Network;
  }
}

MinaBaseLayer satisfies StaticBaseLayer;
