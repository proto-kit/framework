import { AreProofsEnabled, DependencyFactory } from "@proto-kit/common";
import { Mina } from "o1js";
import { match } from "ts-pattern";
import { inject } from "tsyringe";

import { MinaIncomingMessageAdapter } from "../../settlement/messages/MinaIncomingMessageAdapter";
import {
  sequencerModule,
  SequencerModule,
} from "../../sequencer/builder/SequencerModule";
import { MinaTransactionSender } from "../../settlement/transactions/MinaTransactionSender";
import { WithdrawalQueue } from "../../settlement/messages/WithdrawalQueue";

import { BaseLayer } from "./BaseLayer";

export interface MinaBaseLayerConfig {
  network:
    | {
        type: "local";
      }
    | {
        type: "lightnet";
        graphql: string;
        archive: string;
        accountManager?: string;
      }
    | {
        type: "remote";
        graphql: string;
        archive: string;
      };
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
    private readonly areProofsEnabled: AreProofsEnabled
  ) {
    super();
  }

  public dependencies() {
    return {
      IncomingMessageAdapter: {
        useClass: MinaIncomingMessageAdapter,
      },

      TransactionSender: {
        useClass: MinaTransactionSender,
      },

      OutgoingMessageQueue: {
        useClass: WithdrawalQueue,
      },
    };
  }

  public isLocalBlockChain(): boolean {
    return this.config.network.type === "local";
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
