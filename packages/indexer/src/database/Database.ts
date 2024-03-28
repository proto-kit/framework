import { DependencyDeclaration } from "@proto-kit/common";
import { BlockStorage } from "./BlockStorage";

export interface Database {
  dependencies(): {
    BlockStorage: DependencyDeclaration<BlockStorage>;
  };
}
