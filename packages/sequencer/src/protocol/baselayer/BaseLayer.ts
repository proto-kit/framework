import {
  DependencyDeclaration,
  DependencyFactory,
  DependencyRecord,
} from "@proto-kit/common";

import { IncomingMessageAdapter } from "../../settlement/messages/IncomingMessageAdapter";
import type { OutgoingMessageAdapter } from "../../settlement/messages/outgoing/OutgoingMessageCollector";

export interface BaseLayerDependencyRecord extends DependencyRecord {
  IncomingMessageAdapter: DependencyDeclaration<IncomingMessageAdapter>;
  OutgoingMessageAdapter: DependencyDeclaration<
    OutgoingMessageAdapter<unknown>
  >;
}

export interface BaseLayer extends DependencyFactory {
  dependencies: () => BaseLayerDependencyRecord;
}
