import {
  DependencyDeclaration,
  DependencyFactory,
  DependencyRecord,
} from "@proto-kit/common";

import { ComputedBlock } from "../../storage/model/Block";
import { IncomingMessageAdapter } from "../../settlement/messages/IncomingMessageAdapter";

export interface BaseLayerDependencyRecord extends DependencyRecord {
  IncomingMessageAdapter: DependencyDeclaration<IncomingMessageAdapter>;
}

export interface BaseLayer extends DependencyFactory {
  blockProduced: (block: ComputedBlock) => Promise<void>;

  dependencies: () => BaseLayerDependencyRecord;
}
