import { ModulesConfig } from "@proto-kit/common";

import { GraphqlModulesRecord } from "./GraphqlSequencerModule";
import { MempoolResolver } from "./modules/MempoolResolver";
import { QueryGraphqlModule } from "./modules/QueryGraphqlModule";
import { BatchStorageResolver } from "./modules/BatchStorageResolver";
import { NodeStatusResolver } from "./modules/NodeStatusResolver";
import { BlockResolver } from "./modules/BlockResolver";
import { MerkleWitnessResolver } from "./modules/MerkleWitnessResolver";

export type VanillaGraphqlModulesRecord = {
  MempoolResolver: typeof MempoolResolver;
  QueryGraphqlModule: typeof QueryGraphqlModule;
  BlockStorageResolver: typeof BatchStorageResolver;
  NodeStatusResolver: typeof NodeStatusResolver;
  BlockResolver: typeof BlockResolver;
  MerkleWitnessResolver: typeof MerkleWitnessResolver;
};

export class VanillaGraphqlModules {
  public static with<AdditionalModules extends GraphqlModulesRecord>(
    additionalModules: AdditionalModules
  ) {
    return {
      MempoolResolver,
      QueryGraphqlModule,
      BlockStorageResolver: BatchStorageResolver,
      NodeStatusResolver,
      BlockResolver,
      MerkleWitnessResolver,
      ...additionalModules,
    } satisfies VanillaGraphqlModulesRecord;
  }

  public static defaultConfig() {
    return {
      MempoolResolver: {},
      QueryGraphqlModule: {},
      BlockStorageResolver: {},
      NodeStatusResolver: {},
      BlockResolver: {},
      MerkleWitnessResolver: {},
    } satisfies ModulesConfig<VanillaGraphqlModulesRecord>;
  }
}
