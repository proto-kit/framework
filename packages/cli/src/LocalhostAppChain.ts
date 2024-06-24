import "reflect-metadata";
import { Runtime, RuntimeModulesRecord } from "@proto-kit/module";
import { Protocol, ProtocolModulesRecord } from "@proto-kit/protocol";
import {
  VanillaProtocolModules,
  VanillaRuntimeModules,
  SimpleSequencerModules,
} from "@proto-kit/library";
import {
  Sequencer,
  SequencerModulesRecord,
  LocalTaskQueue,
  InMemoryDatabase,
  NoopBaseLayer,
  ManualBlockTrigger,
} from "@proto-kit/sequencer";
import {
  StateServiceQueryModule,
  BlockStorageNetworkStateModule,
  AppChainModulesRecord,
  InMemoryTransactionSender,
  AppChainDefinition,
} from "@proto-kit/sdk";

export class LocalhostAppChainModules {
  public static fromRuntime<RuntimeModules extends RuntimeModulesRecord>(
    runtimeModules: RuntimeModules
  ) {
    return LocalhostAppChainModules.from(runtimeModules, {}, {}, {});
  }

  public static from<
    RuntimeModules extends RuntimeModulesRecord,
    ProtocolModules extends ProtocolModulesRecord,
    SequencerModules extends SequencerModulesRecord,
    AppChainModules extends AppChainModulesRecord,
  >(
    runtimeModules: RuntimeModules,
    protocolModules: ProtocolModules,
    sequencerModules: SequencerModules,
    appchainModules: AppChainModules
  ) {
    return {
      Runtime: Runtime.from({
        modules: VanillaRuntimeModules.with(runtimeModules),
      }),
      Protocol: Protocol.from({
        modules: VanillaProtocolModules.with(protocolModules),
      }),
      Sequencer: Sequencer.from({
        modules: SimpleSequencerModules.with(
          LocalTaskQueue,
          InMemoryDatabase,
          NoopBaseLayer,
          ManualBlockTrigger,
          sequencerModules
        ),
      }),
      modules: {
        // TODO: remove in favour of a real tx sender for the SettlementModule
        // temporary dependency to make the SettlementModule work
        TransactionSender: InMemoryTransactionSender,
        QueryTransportModule: StateServiceQueryModule,
        NetworkStateTransportModule: BlockStorageNetworkStateModule,
        ...appchainModules,
      } satisfies AppChainModulesRecord,
    } satisfies AppChainDefinition<any, any, any, any>;
  }

  public static defaultConfig() {
    return {
      Runtime: VanillaRuntimeModules.defaultConfig(),
      Protocol: VanillaProtocolModules.defaultConfig(),
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
          MerkleWitnessResolver: {},
          UnprovenBlockResolver: {},
        },

        Mempool: {},
        BlockProducerModule: {},
        BaseLayer: {},
        TaskQueue: {},
        BlockTrigger: {},
        LocalTaskWorkerModule: {
          StateTransitionTask: {},
          RuntimeProvingTask: {},
          StateTransitionReductionTask: {},
          BlockReductionTask: {},
          BlockProvingTask: {},
          BlockBuildingTask: {},
        },
      },
      QueryTransportModule: {},
      NetworkStateTransportModule: {},
    };
  }
}
