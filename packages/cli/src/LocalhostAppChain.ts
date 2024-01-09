import "reflect-metadata";
import { PrivateKey } from "o1js";
import { Runtime, RuntimeModulesRecord } from "@proto-kit/module";
import {
  BlockProver,
  StateTransitionProver,
  VanillaProtocol,
  AccountStateModule,
} from "@proto-kit/protocol";
import { ModulesConfig } from "@proto-kit/common";
import {
  BlockProducerModule,
  LocalTaskQueue,
  LocalTaskWorkerModule,
  ManualBlockTrigger,
  NoopBaseLayer,
  PrivateMempool,
  Sequencer,
  SequencerModulesRecord,
} from "@proto-kit/sequencer";
import {
  BlockStorageResolver,
  GraphqlSequencerModule,
  GraphqlServer,
  MempoolResolver,
  NodeStatusResolver,
  QueryGraphqlModule,
} from "@proto-kit/api";
import {
  AppChain,
  AppChainModulesRecord,
  InMemorySigner,
  InMemoryTransactionSender,
  StateServiceQueryModule,
} from "@proto-kit/sdk";

type LocalhostAppChainProtocolModules = {
  StateTransitionProver: typeof StateTransitionProver;
  BlockProver: typeof BlockProver;
  AccountState: typeof AccountStateModule;
};

export class LocalhostAppChain<
  RuntimeModules extends RuntimeModulesRecord
> extends AppChain<
  RuntimeModules,
  LocalhostAppChainProtocolModules,
  SequencerModulesRecord,
  AppChainModulesRecord
> {
  public static fromRuntime<
    RuntimeModules extends RuntimeModulesRecord
  >(definition: {
    modules: RuntimeModules;
    config: ModulesConfig<RuntimeModules>;
  }) {
    const appChain = AppChain.from({
      runtime: Runtime.from(definition),

      protocol: VanillaProtocol.from({}),

      sequencer: Sequencer.from({
        modules: {
          Mempool: PrivateMempool,
          GraphqlServer,
          LocalTaskWorkerModule,
          BaseLayer: NoopBaseLayer,
          BlockProducerModule,
          BlockTrigger: ManualBlockTrigger,
          TaskQueue: LocalTaskQueue,

          Graphql: GraphqlSequencerModule.from({
            modules: {
              MempoolResolver,
              QueryGraphqlModule,
              BlockStorageResolver,
              NodeStatusResolver,
            },

            config: {
              MempoolResolver: {},
              QueryGraphqlModule: {},
              BlockStorageResolver: {},
              NodeStatusResolver: {},
            },
          }),
        },
      }),

      modules: {
        Signer: InMemorySigner,
        TransactionSender: InMemoryTransactionSender,
        QueryTransportModule: StateServiceQueryModule,
      },
    });

    // @ts-ignore
    appChain.configurePartial({
      Runtime: definition.config as any,

      Protocol: {
        BlockProver: {},
        StateTransitionProver: {},
        AccountState: {},
      },

      Sequencer: {
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
        },

        Mempool: {},
        BlockProducerModule: {},
        LocalTaskWorkerModule: {},
        BaseLayer: {},
        TaskQueue: {},

        BlockTrigger: {},
      },

      TransactionSender: {},
      QueryTransportModule: {},

      Signer: {
        signer: PrivateKey.random(),
      },
    });

    return appChain;
  }
}
