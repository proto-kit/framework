import {
  DependencyDeclaration,
  DependencyFactory,
  DependencyRecord,
} from "@proto-kit/common";

import { IncomingMessageAdapter } from "../../settlement/messages/IncomingMessageAdapter";
import type { OutgoingMessageAdapter } from "../../settlement/messages/outgoing/OutgoingMessageCollector";

import { MinaNetworkUtils } from "./network-utils/MinaNetworkUtils";

export interface StaticBaseLayerDependencyRecord extends DependencyRecord {
  IncomingMessageAdapter: DependencyDeclaration<IncomingMessageAdapter>;
  OutgoingMessageAdapter: DependencyDeclaration<
    OutgoingMessageAdapter<unknown>
  >;
}

export interface StaticBaseLayer extends DependencyFactory {
  dependencies: () => StaticBaseLayerDependencyRecord;
}

export interface BaseLayerDependencyRecord extends DependencyRecord {
  NetworkUtils: DependencyDeclaration<MinaNetworkUtils>;
}

export interface BaseLayer extends DependencyFactory {
  dependencies: () => BaseLayerDependencyRecord;
}
