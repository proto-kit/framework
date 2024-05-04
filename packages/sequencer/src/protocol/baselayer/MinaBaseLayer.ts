import { DependencyFactory } from "@proto-kit/common";
import { Mina } from "o1js";

import { MinaIncomingMessageAdapter } from "../../settlement/messages/MinaIncomingMessageAdapter";
import { SequencerModule } from "../../sequencer/builder/SequencerModule";
import { MinaTransactionSender } from "../../settlement/transactions/MinaTransactionSender";
import { WithdrawalQueue } from "../../settlement/messages/WithdrawalQueue";

import { BaseLayer } from "./BaseLayer";

export interface MinaBaseLayerConfig {
  network: {
    local: boolean;
    graphql?: string;
    archive?: string;
  };
}

export class MinaBaseLayer
  extends SequencerModule<MinaBaseLayerConfig>
  implements BaseLayer, DependencyFactory
{
  public network?: Parameters<typeof Mina.setActiveInstance>[0];

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

  public async start(): Promise<void> {
    const { network } = this.config;

    if (
      !network.local &&
      (network.graphql === undefined || network.archive === undefined)
    ) {
      throw new Error(
        "The API endpoints have to be defined, if the network is remote"
      );
    }

    const Network = this.config.network.local
      ? await Mina.LocalBlockchain({ proofsEnabled: false })
      : Mina.Network({
          mina: network.graphql!,
          archive: network.archive!,
        });
    Mina.setActiveInstance(Network);
    this.network = Network;
  }
}
