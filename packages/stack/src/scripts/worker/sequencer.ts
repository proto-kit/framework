import {
  AppChain,
  StateServiceQueryModule,
  BlockStorageNetworkStateModule,
} from "@proto-kit/sdk";
import { SimpleSequencerModules } from "@proto-kit/library";
import { BullQueue } from "@proto-kit/deployment";
import {
  Sequencer,
  InMemoryDatabase,
  MinaBaseLayer,
  TimedBlockTrigger,
  DatabasePruneModule,
} from "@proto-kit/sequencer";
import {
  VanillaGraphqlModules,
  GraphqlSequencerModule,
  GraphqlServer,
} from "@proto-kit/api";

import { app } from "./app";

export const sequencer = AppChain.from({
  Runtime: app.Runtime,
  Protocol: app.Protocol,
  Sequencer: Sequencer.from({
    modules: SimpleSequencerModules.with({
      TaskQueue: BullQueue,
      Database: InMemoryDatabase,
      BaseLayer: MinaBaseLayer,
      BlockTrigger: TimedBlockTrigger,
      DatabasePruneModule: DatabasePruneModule,
      GraphqlServer: GraphqlServer,
      Graphql: GraphqlSequencerModule.from({
        modules: VanillaGraphqlModules.with({}),
      }),
    }),
  }),
  modules: {
    QueryTransportModule: StateServiceQueryModule,
    NetworkStateTransportModule: BlockStorageNetworkStateModule,
  },
});

sequencer.configure({
  Runtime: app.config.runtime,
  Protocol: app.config.protocol,
  Sequencer: {
    ...SimpleSequencerModules.defaultConfig(),
    Database: {},
    BaseLayer: {
      network: {
        local: true,
      },
    },
    BlockTrigger: {
      blockInterval: 30000,
      settlementInterval: 60000,
    },
    TaskQueue: {
      redis: {
        // host: "protokit-redis",
        host: "localhost",
        port: 6379,
        password: "password",
      },
    },
    ProtocolStartupModule: {},
    GraphqlServer: {
      host: "0.0.0.0",
      port: 8080,
      graphiql: true,
    },

    Graphql: {
      QueryGraphqlModule: {},
      MempoolResolver: {},
      BatchStorageResolver: {},
      NodeStatusResolver: {},
      MerkleWitnessResolver: {},
      BlockResolver: {},
    },
  },
  QueryTransportModule: {},
  NetworkStateTransportModule: {},
});
