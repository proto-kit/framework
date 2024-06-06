import "reflect-metadata";
import { PrivateKey } from "o1js";
import { Runtime, RuntimeModulesRecord } from "@proto-kit/module";
import {
  MandatoryProtocolModulesRecord,
  Protocol,
  ProtocolModulesRecord,
} from "@proto-kit/protocol";
import {
  InMemorySequencerModules,
  VanillaProtocolModules,
  VanillaRuntimeModules,
  VanillaProtocolModulesRecord,
  InMemorySequencerModulesRecord,
} from "@proto-kit/library";
import {
  Sequencer,
  SequencerModulesRecord,
  TaskWorkerModulesRecord,
} from "@proto-kit/sequencer";
import {
  BlockStorageResolver,
  GraphqlSequencerModule,
  GraphqlServer,
  MempoolResolver,
  MerkleWitnessResolver,
  NodeStatusResolver,
  QueryGraphqlModule,
  UnprovenBlockResolver,
} from "@proto-kit/api";
import {
  AppChain,
  StateServiceQueryModule,
  BlockStorageNetworkStateModule,
  AppChainModulesRecord,
  InMemoryTransactionSender,
} from "@proto-kit/sdk";
import { ModulesConfig } from "@proto-kit/common";

export class LocalhostAppChain<
  RuntimeModules extends RuntimeModulesRecord,
  ProtocolModules extends ProtocolModulesRecord &
    MandatoryProtocolModulesRecord,
  SequencerModules extends SequencerModulesRecord,
  AppChainModules extends AppChainModulesRecord,
> extends AppChain<
  RuntimeModules,
  ProtocolModules,
  SequencerModules,
  AppChainModules
> {
  public static fromRuntime<RuntimeModules extends RuntimeModulesRecord>(
    runtimeModules: RuntimeModules
  ) {
    return LocalhostAppChain.with(runtimeModules, {}, {}, {});
  }

  public static with<
    RuntimeModules extends RuntimeModulesRecord,
    ProtocolModules extends ProtocolModulesRecord,
    SequencerModules extends SequencerModulesRecord,
    AdditionalTasks extends TaskWorkerModulesRecord,
  >(
    runtimeModules: RuntimeModules,
    protocolModules: ProtocolModules,
    sequencerModules: SequencerModules,
    additionalTasks: AdditionalTasks
  ) {
    const graphqlModule = GraphqlSequencerModule.from({
      modules: {
        MempoolResolver,
        QueryGraphqlModule,
        BlockStorageResolver,
        NodeStatusResolver,
        UnprovenBlockResolver,
        MerkleWitnessResolver,
      },
    });

    const appChain = LocalhostAppChain.from({
      Runtime: Runtime.from({
        modules: VanillaRuntimeModules.with(runtimeModules),
      }),
      Protocol: Protocol.from({
        modules: VanillaProtocolModules.with(protocolModules),
      }),
      Sequencer: Sequencer.from({
        modules: InMemorySequencerModules.with(
          {
            GraphqlServer: GraphqlServer,
            Graphql: graphqlModule,
            ...sequencerModules,
          },
          additionalTasks
        ),
      }),
      modules: {
        // TODO: remove in favour of a real tx sender for the SettlementModule
        // temporary dependency to make the SettlementModule work
        TransactionSender: InMemoryTransactionSender,
        QueryTransportModule: StateServiceQueryModule,
        NetworkStateTransportModule: BlockStorageNetworkStateModule,
      },
    });

    const protocolConfig = {
      BlockProver: {},
      StateTransitionProver: {},
      AccountState: {},
      BlockHeight: {},
      LastStateRoot: {},
      TransactionFee: {
        tokenId: 0n,
        feeRecipient: PrivateKey.random().toPublicKey().toBase58(),
        baseFee: 0n,
        perWeightUnitFee: 0n,
        methods: {},
      },
    } satisfies ModulesConfig<VanillaProtocolModulesRecord>;

    const sequencerConfig = {
      Database: {},
      UnprovenProducerModule: {},

      Graphql: {
        QueryGraphqlModule: {},
        MempoolResolver: {},
        BlockStorageResolver: {},
        NodeStatusResolver: {},
        MerkleWitnessResolver: {},
        UnprovenBlockResolver: {},
      },

      GraphqlServer: {
        port: 8080,
        host: "0.0.0.0",
        graphiql: true,
      },

      Mempool: {},
      BlockProducerModule: {},
      BaseLayer: {},
      TaskQueue: {},
      BlockTrigger: {},
      LocalTaskWorkerModule: {},
    } satisfies ModulesConfig<
      InMemorySequencerModulesRecord & {
        Graphql: typeof graphqlModule;
        GraphqlServer: typeof GraphqlServer;
      }
    >;

    // eslint-disable-next-line max-len
    /* eslint-disable @typescript-eslint/consistent-type-assertions,@typescript-eslint/no-unsafe-assignment */
    appChain.configurePartial({
      Protocol: protocolConfig as any,
      Sequencer: sequencerConfig as any,
      QueryTransportModule: {},
      NetworkStateTransportModule: {},
    });
    // eslint-disable-next-line max-len
    /* eslint-enable @typescript-eslint/consistent-type-assertions,@typescript-eslint/no-unsafe-assignment */

    return appChain;
  }
}
