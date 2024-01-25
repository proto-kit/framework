import { DependencyFactory, DependencyRecord, noop } from "@proto-kit/common";

import { MinaIncomingMessageAdapter } from "../../settlement/messages/MinaIncomingMessageAdapter";
import { ComputedBlock } from "../../storage/model/Block";
import { SequencerModule } from "../../sequencer/builder/SequencerModule";

import { BaseLayer } from "./BaseLayer";
import { Mina } from "o1js";
import { WithdrawalQueue } from "../../settlement/messages/WithdrawalQueue";

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
      OutgoingMessageQueue: {
        useClass: WithdrawalQueue,
      },
    };
  }

  public blockProduced(block: ComputedBlock): Promise<void> {
    // TODO
    return Promise.resolve(undefined);
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
      ? Mina.LocalBlockchain({ proofsEnabled: false })
      : Mina.Network({
          mina: network.graphql!,
          archive: network.archive!,
        });
    Mina.setActiveInstance(Network);
    this.network = Network;
  }
}
