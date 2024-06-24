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
} from "@proto-kit/sequencer";

import { app } from "./app";

export const sequencer = AppChain.from({
  Runtime: app.Runtime,
  Protocol: app.Protocol,
  Sequencer: Sequencer.from({
    modules: SimpleSequencerModules.with(
      BullQueue,
      InMemoryDatabase,
      MinaBaseLayer,
      TimedBlockTrigger,
      {}
    ),
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
    GraphqlServer: {
      host: "0.0.0.0",
      port: 8080,
      graphiql: true,
    },
  },
  QueryTransportModule: {},
  NetworkStateTransportModule: {},
});