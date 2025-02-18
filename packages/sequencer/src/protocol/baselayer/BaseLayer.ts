import {
  DependencyDeclaration,
  DependencyFactory,
  DependencyRecord,
} from "@proto-kit/common";

import { IncomingMessageAdapter } from "../../settlement/messages/IncomingMessageAdapter";
import type { OutgoingMessageAdapter } from "../../settlement/messages/WithdrawalQueue";

export interface BaseLayerDependencyRecord extends DependencyRecord {
  IncomingMessageAdapter: DependencyDeclaration<IncomingMessageAdapter>;
  // TODO Move that to Database?
  OutgoingMessageQueue: DependencyDeclaration<OutgoingMessageAdapter>;
}

export interface BaseLayer extends DependencyFactory {
  dependencies: () => BaseLayerDependencyRecord;
}
