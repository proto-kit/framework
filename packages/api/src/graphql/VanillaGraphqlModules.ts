import { ModulesConfig } from "@proto-kit/common";

import { GraphqlModulesRecord } from "./GraphqlSequencerModule";
import { MempoolResolver } from "./modules/MempoolResolver";
import { QueryGraphqlModule } from "./modules/QueryGraphqlModule";
import { BatchStorageResolver } from "./modules/BatchStorageResolver";
import { NodeStatusResolver } from "./modules/NodeStatusResolver";
import { BlockResolver } from "./modules/BlockResolver";
import { LinkedMerkleWitnessResolver as MerkleWitnessResolver } from "./modules/LinkedMerkleWitnessResolver";

export type VanillaGraphqlModulesRecord = {
  MempoolResolver: typeof MempoolResolver;
  QueryGraphqlModule: typeof QueryGraphqlModule;
  BatchStorageResolver: typeof BatchStorageResolver;
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
      BatchStorageResolver,
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
      BatchStorageResolver: {},
      NodeStatusResolver: {},
      BlockResolver: {},
      MerkleWitnessResolver: {},
    } satisfies ModulesConfig<VanillaGraphqlModulesRecord>;
  }
}
