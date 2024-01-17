import "reflect-metadata";
import { PrivateKey } from "o1js";
import { Runtime, RuntimeModulesRecord } from "@proto-kit/module";
import {
  BlockProver,
  StateTransitionProver,
  VanillaProtocol,
  AccountStateModule,
  ProtocolModulesRecord,
} from "@proto-kit/protocol";
import { ModulesConfig } from "@proto-kit/common";
import {
  BlockProducerModule,
  InMemoryDatabase,
  LocalTaskQueue,
  LocalTaskWorkerModule,
  ManualBlockTrigger,
  NoopBaseLayer,
  PrivateMempool,
  Sequencer,
  SequencerModulesRecord,
  UnprovenProducerModule,
} from "@proto-kit/sequencer";
import {
  BlockStorageResolver,
  GraphqlSequencerModule,
  GraphqlServer,
  MempoolResolver,
  NodeStatusResolver,
  QueryGraphqlModule,
  UnprovenBlockResolver,
} from "@proto-kit/api";
import {
  AppChain,
  AppChainModulesRecord,
  InMemorySigner,
  InMemoryTransactionSender,
  StateServiceQueryModule,
  BlockStorageNetworkStateModule,
} from "@proto-kit/sdk";

export class LocalhostAppChain<
  RuntimeModules extends RuntimeModulesRecord
> extends AppChain<
  RuntimeModules,
  ProtocolModulesRecord,
  SequencerModulesRecord,
  AppChainModulesRecord
> {
  public static fromRuntime<
    RuntimeModules extends RuntimeModulesRecord
  >(definition: { modules: RuntimeModules }) {
    const appChain = LocalhostAppChain.from({
      runtime: Runtime.from(definition),

      protocol: VanillaProtocol.from({}),

      sequencer: Sequencer.from({
        modules: {
          Database: InMemoryDatabase,
          Mempool: PrivateMempool,
          GraphqlServer,
          LocalTaskWorkerModule,
          BaseLayer: NoopBaseLayer,
          BlockProducerModule,
          UnprovenProducerModule,
          BlockTrigger: ManualBlockTrigger,
          TaskQueue: LocalTaskQueue,

          Graphql: GraphqlSequencerModule.from({
            modules: {
              MempoolResolver,
              QueryGraphqlModule,
              BlockStorageResolver,
              NodeStatusResolver,
              UnprovenBlockResolver,
            },
          }),
        },
      }),

      modules: {
        QueryTransportModule: StateServiceQueryModule,
        NetworkStateTransportModule: BlockStorageNetworkStateModule,
      },
    });

    appChain.configure({
      ...appChain.config,

      Protocol: {
        BlockProver: {},
        StateTransitionProver: {},
        AccountState: {},
        BlockHeight: {},
      },

      Sequencer: {
        Database: {},
        UnprovenProducerModule: {},

        GraphqlServer: {
          port: 8080,
          host: "0.0.0.0",
          graphiql: true,
        },

        Graphql: {
          QueryGraphqlModule: {},
          MempoolResolver: {},
          BlockStorageResolver: {},
          NodeStatusResolver: {},
          UnprovenBlockResolver: {},
        },

        Mempool: {},
        BlockProducerModule: {},
        LocalTaskWorkerModule: {},
        BaseLayer: {},
        TaskQueue: {},
        BlockTrigger: {},
      },

      QueryTransportModule: {},
      NetworkStateTransportModule: {},
    });

    return appChain;
  }
}
