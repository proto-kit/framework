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
} from "@proto-kit/library";
import { Sequencer, SequencerModulesRecord } from "@proto-kit/sequencer";
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
    const appChain = LocalhostAppChain.from({
      Runtime: Runtime.from({
        modules: VanillaRuntimeModules.with(runtimeModules),
      }),
      Protocol: Protocol.from({
        modules: VanillaProtocolModules.with({}),
      }),
      Sequencer: Sequencer.from({
        modules: InMemorySequencerModules.with({
          GraphqlServer: GraphqlServer,
          Graphql: GraphqlSequencerModule.from({
            modules: {
              MempoolResolver,
              QueryGraphqlModule,
              BlockStorageResolver,
              NodeStatusResolver,
              UnprovenBlockResolver,
              MerkleWitnessResolver,
            },
          }),
        }),
      }),
      modules: {
        // TODO: remove in favour of a real tx sender for the SettlementModule
        // temporary dependency to make the SettlementModule work
        TransactionSender: InMemoryTransactionSender,
        QueryTransportModule: StateServiceQueryModule,
        NetworkStateTransportModule: BlockStorageNetworkStateModule,
      },
    });

    appChain.configurePartial({
      Protocol: {
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
          MerkleWitnessResolver: {},
          UnprovenBlockResolver: {},
        },

        Mempool: {},
        BlockProducerModule: {},
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
