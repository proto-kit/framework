import { DependencyDeclaration, DependencyRecord } from "@proto-kit/common";

import { IncomingMessageAdapter } from "../../settlement/messages/IncomingMessageAdapter";
import type { OutgoingMessageAdapter } from "../../settlement/messages/outgoing/OutgoingMessageCollector";

import { MinaNetworkUtils } from "./network-utils/MinaNetworkUtils";

export interface BaseLayerDependencyRecord<T> extends DependencyRecord<T> {
  NetworkUtils: DependencyDeclaration<MinaNetworkUtils, T>;
  IncomingMessageAdapter: DependencyDeclaration<IncomingMessageAdapter>;
  OutgoingMessageAdapter: DependencyDeclaration<
    OutgoingMessageAdapter<unknown>
  >;
}

export interface BaseLayer {}
