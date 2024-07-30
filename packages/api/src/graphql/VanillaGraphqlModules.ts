import { ModulesConfig } from "@proto-kit/common";

import { GraphqlModulesRecord } from "./GraphqlSequencerModule";
import { MempoolResolver } from "./modules/MempoolResolver";
import { QueryGraphqlModule } from "./modules/QueryGraphqlModule";
import { BlockStorageResolver } from "./modules/BlockStorageResolver";
import { NodeStatusResolver } from "./modules/NodeStatusResolver";
import { UnprovenBlockResolver } from "./modules/UnprovenBlockResolver";
import { MerkleWitnessResolver } from "./modules/MerkleWitnessResolver";

export type VanillaGraphqlModulesRecord = {
  MempoolResolver: typeof MempoolResolver;
  QueryGraphqlModule: typeof QueryGraphqlModule;
  BlockStorageResolver: typeof BlockStorageResolver;
  NodeStatusResolver: typeof NodeStatusResolver;
  UnprovenBlockResolver: typeof UnprovenBlockResolver;
  MerkleWitnessResolver: typeof MerkleWitnessResolver;
};

export class VanillaGraphqlModules {
  public static with<AdditionalModules extends GraphqlModulesRecord>(
    additionalModules: AdditionalModules
  ) {
    return {
      MempoolResolver,
      QueryGraphqlModule,
      BlockStorageResolver,
      NodeStatusResolver,
      UnprovenBlockResolver,
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
      UnprovenBlockResolver: {},
      MerkleWitnessResolver: {},
    } satisfies ModulesConfig<VanillaGraphqlModulesRecord>;
  }
}
