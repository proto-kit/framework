import {
  DependencyDeclaration,
  DependencyFactory,
  DependencyRecord,
} from "@proto-kit/common";

import { IncomingMessageAdapter } from "../../settlement/messages/IncomingMessageAdapter";
import type { OutgoingMessageQueue } from "../../settlement/messages/WithdrawalQueue";

export interface BaseLayerDependencyRecord extends DependencyRecord {
  IncomingMessageAdapter: DependencyDeclaration<IncomingMessageAdapter>;
  // TODO Move that to Database?
  OutgoingMessageQueue: DependencyDeclaration<OutgoingMessageQueue>;
}

export interface BaseLayer extends DependencyFactory {
  dependencies: () => BaseLayerDependencyRecord;
}
